"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useEffect, useRef, useState } from "react"
import WizardProgress from "@/components/ui/wizard-progress"
import { ArrowLeft, ArrowRight, CalendarPlus, RotateCcw } from "lucide-react"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import FileUpload from "@/components/ui/file-upload"
import { Textarea } from "@/components/ui/textarea"
import {
  WizardLoading,
  WizardLoadingError,
} from "@/components/wizard/wizard-loading"

import WizardReviewStep from "@/components/wizard/steps/review"
import WizardTimeStep from "./steps/time"
import { generateReviewQuestions } from "@/lib/api/reviewQuestions"
import { generateSchedulePlan } from "@/lib/api/schedule"
import { Schedule, WizardSchedule } from "@planify/types"
import type { WizardScheduleState } from "@/types"
import { addSchedulePlan } from "@/lib/storage/schedule-plan"
import {
  clearWizardDraft,
  loadWizardDraft,
  saveWizardDraft,
} from "@/lib/wizard/wizard-draft"
import { useRouter } from "next/navigation"
import { fetchQuotaUsage, type QuotaUsage } from "@/lib/api/quota"
import type { ReviewQuestion, ReviewAnswer } from "@planify/types"
import { QuotaHint } from "./quotaHint"

const TOTAL_STEPS = 4

export default function WizardStep({ initStepNum }: { initStepNum: number }) {
  //*IMPROVEMENTS TODO: Make the review questions regenerate on changes to the schedule in the wizard.
  const router = useRouter()

  function initialWizardState(): WizardScheduleState {
    return {
      stepNum: initStepNum,
      schedule: {
        objective: "",
        notesContext: "",
        startDate: undefined,
        endDate: undefined,
        timePerDay: 60,
      },
      reviewState: "idle",
      reviewQuestions: [],
      reviewAnswers: [],
      scheduleState: "idle",
    }
  }

  const [wizard, setWizard] = useState<WizardScheduleState>(initialWizardState)
  const [quota, setQuota] = useState<QuotaUsage | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewErrorCode, setReviewErrorCode] = useState<string | null>(null)

  /** Saved questions/answers from before a regeneration attempt, restored on cancel. */
  const savedReviewRef = useRef<{ questions: ReviewQuestion[]; answers: ReviewAnswer[] } | null>(null)

  /*
   * --------------------------------------------------------------------------
   * Draft persistence
   * --------------------------------------------------------------------------
   * The whole wizard survives refreshes and route changes via sessionStorage.
   */

  // Consumed once to deliberately skip a persist: either the mount pass
  // (so the pristine initial state can never clobber a stored draft before
  // it is read) or the Start-over reset (so an empty draft is not written
  // back after clearing).
  const skipNextPersistRef = useRef(true)

  // Restores a saved draft after mount rather than in the state
  // initializer: server render and first client render must agree for
  // hydration, and controlled inputs would otherwise mismatch. The restore
  // is queued off the effect's synchronous pass so replacing the whole
  // wizard state lands in its own render instead of cascading mid-commit.
  useEffect(() => {
    queueMicrotask(() => {
      const draft = loadWizardDraft()

      if (draft != null) {
        setWizard(draft)
      }
    })
  }, [])

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false

      return
    }

    saveWizardDraft(wizard)
  }, [wizard])

  // Fetch quota usage on mount so the wizard can show remaining counts.
  useEffect(() => {
    let cancelled = false
    fetchQuotaUsage().then((data) => {
      if (!cancelled) setQuota(data)
    })
    return () => { cancelled = true }
  }, [])

  /** Re-fetch quota after a mutation consumes quota. */
  async function refreshQuota() {
    setQuota(await fetchQuotaUsage())
  }

  const {
    stepNum,
    schedule: { objective, notesContext, startDate, endDate, timePerDay },
    reviewState,
    reviewAnswers,
    reviewQuestions,
  } = wizard

  const scheduleQuotaExhausted =
    quota != null &&
    (quota.schedule_plan?.used ?? 0) >= (quota.schedule_plan?.limit ?? Infinity)
  const reviewQuotaExhausted =
    quota != null &&
    (quota.review_questions?.used ?? 0) >= (quota.review_questions?.limit ?? Infinity)

  function updateSchedule(updates: Partial<WizardSchedule>) {
    setWizard((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        ...updates,
      },
    }))
  }
  function setStep(stepNum: number) {
    setWizard((prev) => ({
      ...prev,
      stepNum,
    }))
  }

  // Wipes the saved draft and returns to a pristine wizard. The skip flag
  // stops the reset render from re-persisting an empty draft.
  function handleStartOver() {
    clearWizardDraft()
    skipNextPersistRef.current = true
    setWizard(initialWizardState())
  }

  const reviewGenerationController = useRef<AbortController | null>(null)

  function isNextDisabled() {
    if (stepNum == 1) {
      return objective === ""
    } else if (stepNum == 2) {
      return notesContext === ""
    } else if (stepNum == 3) {
      return startDate === undefined || endDate === undefined
    } else if (stepNum == 4) {
      const unanswered = reviewAnswers.findIndex(
        (a) => a.answer === undefined || a.answer.trim() === ""
      )
      return unanswered !== -1
    }

    return false
  }
  async function createSchedule(schedule: Schedule) {
    setWizard((prev) => ({
      ...prev,
      stepNum: 5,
      scheduleState: "loading",
    }))

    try {
      const generatedSchedulePlan = await generateSchedulePlan(schedule)

      console.log(generatedSchedulePlan)

      setWizard((prev) => ({
        ...prev,
        scheduleState: "success",
      }))

      await addSchedulePlan(generatedSchedulePlan)
      clearWizardDraft()
      
      router.push(`/view/schedule/${generatedSchedulePlan.id}`)
    } catch (_error) {
      setWizard((prev) => ({
        ...prev,
        scheduleState: "error",
      }))
    }
  }
  function cancelScheduleGeneration() {
    scheduleGenerationController.current?.abort()
    scheduleGenerationController.current = null

    setWizard((prev) => ({
      ...prev,
      scheduleState: "idle",
      stepNum: 4,
    }))
  }
  function retryScheduleGeneration() {
    if (!startDate || !endDate) return

    createSchedule({
      objective,
      notesContext,
      startDate,
      endDate,
      timePerDay,
      reviewAnswers,
    })
  }

  async function createReviewQuestionsFromSchedule(
    {
      objective,
      notesContext,
      startDate,
      endDate,
      timePerDay,
    }: {
      objective: string
      notesContext: string
      startDate: Date | undefined
      endDate: Date | undefined
      timePerDay: number
    },
    onGenerationComplete: () => void
  ) {
    const controller = new AbortController()
    reviewGenerationController.current = controller

    setWizard((prev) => ({ ...prev, reviewState: "loading" }))

    try {
      const schedule: WizardSchedule = {
        objective,
        notesContext,
        startDate,
        endDate,
        timePerDay,
      }
      const questions =
        wizard.reviewQuestions.length > 0
          ? wizard.reviewQuestions
          : await generateReviewQuestions(schedule, controller.signal)

      setWizard((prev) => ({
        ...prev,
        reviewQuestions: questions,
        reviewState: "success",
      }))

      // Refresh quota only when fresh questions were generated (not cached).
      if (wizard.reviewQuestions.length === 0) {
        void refreshQuota()
      }

      onGenerationComplete()
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      setReviewError(error instanceof Error ? error.message : null)
      setReviewErrorCode(error instanceof Error ? error.cause as string : null)
      setWizard((prev) => ({ ...prev, reviewState: "error" }))
    }
  }
  function cancelReviewGeneration() {
    reviewGenerationController.current?.abort()

    reviewGenerationController.current = null

    // Restore previous questions if this was a regeneration attempt.
    if (savedReviewRef.current) {
      console.log(savedReviewRef.current)
      setWizard((prev) => ({
        ...prev,
        reviewQuestions: savedReviewRef.current!.questions,
        reviewAnswers: savedReviewRef.current!.answers,
        reviewState: "success",
      }))
      savedReviewRef.current = null
    } else {
      setWizard((prev) => ({ ...prev, reviewState: "idle" }))
      setStep(3)
    }
  }
  const scheduleGenerationController = useRef<AbortController | null>(null)

  let step: {
    title: string
    description: string
    content: React.ReactNode
  }

  switch (stepNum) {
    case 1:
      step = {
        title: "Objective",
        description: "Tell Planify what you want to accomplish.",
        content: (
          <Field>
            <FieldLabel htmlFor="wizard-objective">Goal</FieldLabel>

            <FieldContent>
              <Input
                id="wizard-objective"
                placeholder="Finish my homework..."
                value={objective}
                onChange={(e) => updateSchedule({ objective: e.target.value })}
              />
            </FieldContent>

            <FieldDescription>
              Describe the main objective you want this schedule to help you
              accomplish.
            </FieldDescription>
          </Field>
        ),
      }
      break
    case 2:
      step = {
        title: "Context & Notes",
        description:
          "Add details that help Planify AI understand your specific needs, preferences, and goals.",
        content: (
          <Field>
            <FieldLabel htmlFor="wizard-notes">Type notes</FieldLabel>
            <FieldContent>
              <Textarea
                id="wizard-notes"
                className="min-h-32 resize-none"
                value={notesContext}
                onChange={(e) =>
                  updateSchedule({ notesContext: e.target.value })
                }
              />
            </FieldContent>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm tracking-wider text-muted-foreground uppercase">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <FieldLabel id="wizard-upload-label">
              Upload File{" "}
              <span className="text-muted-foreground italic">(optional)</span>
            </FieldLabel>
            <FieldContent>
              <FileUpload aria-labelledby="wizard-upload-label" />
            </FieldContent>

            <FieldDescription>
              Share any important information, constraints, preferences, or even
              anything that the AI will consider when creating your plan.
            </FieldDescription>
          </Field>
        ),
      }
      break
    case 3: {
      //Is loading for next wizard step?
      if (reviewState === "loading") {
        return (
          <WizardLoading
            cancelFn={cancelReviewGeneration}
            title="review questions"
            estimatedTime="5-10 seconds"
          />
        )
      }

      if (reviewState === "error") {
        return (
          <WizardLoadingError
            errorCode={reviewErrorCode}
            errorMessage={reviewError}
            onRetry={() => {
              setReviewError(null)
              setReviewErrorCode(null)
              createReviewQuestionsFromSchedule(
                {
                  objective,
                  notesContext,
                  startDate,
                  endDate,
                  timePerDay,
                },
                () => setStep(4)
              )
            }}
            goBackFn={() => {
              setReviewError(null)
              setReviewErrorCode(null)
              setWizard((prev) => ({ ...prev, reviewState: "idle" }))
            }}
          />
        )
      }
      //else load this one

      step = {
        title: "Date & Time",
        description: "Select when your schedule begins and ends.",
        content: (
          <WizardTimeStep
            startDate={startDate}
            endDate={endDate}
            setStartDate={(date) => updateSchedule({ startDate: date })}
            setEndDate={(date) => updateSchedule({ endDate: date })}
            timePerDay={timePerDay}
            setTimePerDay={(time) => updateSchedule({ timePerDay: time })}
          />
        ),
      }
      break
    }
    case 4: {
      step = {
        title: "Review Questions",
        description:
          "Answer some questions to create exactly the plan your looking for",
        content: (
          <WizardReviewStep
            reviewQuestions={reviewQuestions}
            reviewAnswers={reviewAnswers}
            setReviewAnswers={(reviewAnswers) =>
              setWizard((prev) => ({
                ...prev,
                reviewAnswers,
              }))
            }
            quotaExhausted={reviewQuotaExhausted}
            onRegenerate={() => {
              // Save previous questions so cancel can restore them.
              savedReviewRef.current = {
                questions: wizard.reviewQuestions,
                answers: wizard.reviewAnswers,
              }

              // Clear cached questions and answers, then generate fresh ones.
              // Must call generateReviewQuestions directly —
              // createReviewQuestionsFromSchedule caches via the closure.
              setWizard((prev) => ({
                ...prev,
                reviewQuestions: [],
                reviewAnswers: [],
                reviewState: "loading",
              }))
              setStep(3)
              setReviewError(null)
              setReviewErrorCode(null)

              const controller = new AbortController()
              reviewGenerationController.current = controller

              const schedule: WizardSchedule = {
                objective,
                notesContext,
                startDate,
                endDate,
                timePerDay,
              }

              generateReviewQuestions(schedule, controller.signal)
                .then((questions) => {
                  savedReviewRef.current = null
                  setWizard((prev) => ({
                    ...prev,
                    reviewQuestions: questions,
                    reviewState: "success",
                  }))
                  setStep(4)
                  void refreshQuota()
                })
                .catch((error) => {
                  if (error instanceof DOMException && error.name === "AbortError") return
                  setReviewError(error instanceof Error ? error.message : null)
                  setReviewErrorCode(error instanceof Error ? error.cause as string : null)
                  setWizard((prev) => ({ ...prev, reviewState: "error" }))
                })
            }}
          />
        ),
      }
      break
    }
    case 5: {
      if (wizard.scheduleState === "loading") {
        return (
          <WizardLoading
            cancelFn={cancelScheduleGeneration}
            title="schedule"
            estimatedTime="30-60 seconds"
          />
        )
      }

      if (wizard.scheduleState === "error") {
        return (
          <WizardLoadingError
            onRetry={retryScheduleGeneration}
            goBackFn={() =>
              setWizard((prev) => ({
                ...prev,
                scheduleState: "idle",
                stepNum: 4,
              }))
            }
          />
        )
      }

      return null
    }
    default:
      step = {
        title: "Error",
        description: "Unknown step",
        content: <p>Error</p>,
      }
  }

  return (
    <Card className="mx-auto flex min-h-135 w-full max-w-xl flex-col">
      <CardHeader className="space-y-5">
        {/* App Name + draft reset */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              Planify
            </p>

            <CardTitle className="mt-1 text-2xl">Schedule Creation</CardTitle>
          </div>

          <div className="flex flex-row items-center gap-1">
            {quota && <QuotaHint quota={quota} />}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Start over"
              title="Start over"
              onClick={handleStartOver}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4">
          <span className="shrink-0 text-sm text-muted-foreground">
            Step {stepNum} of {TOTAL_STEPS}
          </span>

          <div className="flex-1">
            <WizardProgress value={stepNum} max={TOTAL_STEPS} />
          </div>

          {/*TODO: Add navigation on each circle that only navigates to that step if its complete*/}
          <span className="shrink-0 text-sm text-muted-foreground">
            {Math.round(((stepNum - 1) / TOTAL_STEPS) * 100)}%
          </span>
        </div>

        {/* Current Step */}
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{step.title}</h2>

          <CardDescription>{step.description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1">{step.content}</CardContent>

      <CardFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={stepNum === 1}
          onClick={() => setStep(stepNum - 1)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        <Button
          variant={stepNum == TOTAL_STEPS ? "default" : "outline"}
          onClick={
            stepNum == TOTAL_STEPS
              ? () => {
                  if (startDate && endDate) {
                    createSchedule({
                      objective,
                      notesContext,
                      startDate,
                      endDate,
                      timePerDay,
                      reviewAnswers,
                    })
                  }
                }
              : stepNum == 3
                ? () =>
                    createReviewQuestionsFromSchedule(
                      {
                        objective,
                        notesContext,
                        startDate,
                        endDate,
                        timePerDay,
                      },
                      () => setStep(4)
                    )
                : () => setStep(stepNum + 1)
          }
          disabled={isNextDisabled() || (stepNum == TOTAL_STEPS && scheduleQuotaExhausted)}
        >
          {stepNum == TOTAL_STEPS ? "Create" : "Next"}
          {stepNum == TOTAL_STEPS ? (
            <CalendarPlus className="ml-1 h-4 w-4" />
          ) : (
            <ArrowRight className="ml-1 h-4 w-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
