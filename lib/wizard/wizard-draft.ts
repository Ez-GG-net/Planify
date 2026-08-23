import { z } from "zod"
import type { WizardScheduleState } from "@/types"

/*
 * ---------------------------------------------------------------------------
 * Session-scoped wizard draft store.
 *
 * The schedule-creation wizard persists everything the user has entered or
 * generated under `planify.wizard.draft` so a refresh or route change
 * resumes where they left off instead of restarting from step 1.
 *
 * Only durable data is stored: form fields, the current step, and the
 * generated review questions/answers. Transient states (`reviewState`,
 * `scheduleState`) are reconstructed as "idle" on load — resuming into a
 * stuck loading/error screen would defeat the purpose.
 * ---------------------------------------------------------------------------
 */

const WIZARD_DRAFT_KEY = "planify.wizard.draft"

function canUseSessionStorage() {
  return typeof sessionStorage !== "undefined"
}

/*
 * Structural shape check for drafts, deliberately looser than the domain
 * schemas (same reasoning as the transcript store): dates travel as ISO
 * strings through JSON and opaque records keep unknown future fields from
 * wiping an otherwise valid draft on read.
 */
const storedWizardDraftSchema = z.object({
  stepNum: z.number(),
  schedule: z.object({
    objective: z.string(),
    notesContext: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    timePerDay: z.number(),
  }),
  reviewQuestions: z.array(z.record(z.string(), z.unknown())),
  reviewAnswers: z.array(z.record(z.string(), z.unknown())),
})

/** JSON turns Dates into ISO strings; revive them, dropping invalid ones. */
function reviveDate(value: string | undefined): Date | undefined {
  if (value == null) {
    return undefined
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Reads the persisted draft and rebuilds a full WizardScheduleState from
 * it. Returns null when absent or malformed so callers start fresh.
 */
export function loadWizardDraft(): WizardScheduleState | null {
  if (!canUseSessionStorage()) {
    return null
  }

  const item = sessionStorage.getItem(WIZARD_DRAFT_KEY)

  if (!item) {
    return null
  }

  try {
    const result = storedWizardDraftSchema.safeParse(JSON.parse(item))

    if (!result.success) {
      return null
    }

    const stored = result.data

    return {
      // Step 5 is the transient generation screen; never resume into it.
      stepNum: Math.min(Math.max(Math.round(stored.stepNum), 1), 4),
      schedule: {
        objective: stored.schedule.objective,
        notesContext: stored.schedule.notesContext,
        startDate: reviveDate(stored.schedule.startDate),
        endDate: reviveDate(stored.schedule.endDate),
        timePerDay: stored.schedule.timePerDay,
      },
      reviewState: "idle",
      scheduleState: "idle",
      reviewQuestions:
        stored.reviewQuestions as WizardScheduleState["reviewQuestions"],
      reviewAnswers:
        stored.reviewAnswers as WizardScheduleState["reviewAnswers"],
    }
  } catch {
    return null
  }
}

export function saveWizardDraft(state: WizardScheduleState) {
  if (!canUseSessionStorage()) {
    return
  }

  const draft = {
    stepNum: state.stepNum,
    schedule: {
      objective: state.schedule.objective,
      notesContext: state.schedule.notesContext,
      // Dates serialize to ISO strings via JSON.stringify.
      startDate: state.schedule.startDate,
      endDate: state.schedule.endDate,
      timePerDay: state.schedule.timePerDay,
    },
    reviewQuestions: state.reviewQuestions,
    reviewAnswers: state.reviewAnswers,
  }

  sessionStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft))
}

export function clearWizardDraft() {
  if (!canUseSessionStorage()) {
    return
  }

  sessionStorage.removeItem(WIZARD_DRAFT_KEY)
}
