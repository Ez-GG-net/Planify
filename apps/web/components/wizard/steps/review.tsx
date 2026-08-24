"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Check,
  CircleDot,
} from "lucide-react"
import { ReviewAnswer, ReviewQuestion } from "@planify/types"


export default function WizardReviewStep({
  reviewQuestions,
  reviewAnswers,
  setReviewAnswers,
}:  {
  reviewQuestions: ReviewQuestion[]
  reviewAnswers: ReviewAnswer[]
  setReviewAnswers: (reviewAnswers: ReviewAnswer[]) => void
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0)

  useEffect(() => {
    if (reviewAnswers.length === 0 && reviewQuestions.length > 0) {
      setReviewAnswers(
        reviewQuestions.map((question) => ({
          key: question.noteTitle,
          answer: undefined,
          choiceNum: undefined,
        }))
      )
    }
  }, [reviewQuestions, reviewAnswers.length, setReviewAnswers])

  const question = reviewQuestions[currentQuestion]

  function updateAnswer(answer: ReviewAnswer) {
    const updated = [...reviewAnswers]
    updated[currentQuestion] = answer
    setReviewAnswers(updated)
  }
  function goToNextQuestion(updatedAnswers: ReviewAnswer[]) {
    //if not on last question
    if (currentQuestion < reviewQuestions.length - 1) {
      //go to next question
      setCurrentQuestion((q) => q + 1)
      return
    }

    //find unanswered questions
    const unanswered = updatedAnswers.findIndex(
      (a) => a.answer === undefined || a.answer.trim() === ""
    )

    //go to that one
    if (unanswered !== -1) {
      setCurrentQuestion(unanswered)
    }
  }

  const currentAnswer = reviewAnswers[currentQuestion] ?? {
    choiceNum: undefined,
    answer: undefined,
  }
  
  const selectedChoiceValue =
    currentAnswer.choiceNum === undefined || currentAnswer.choiceNum === -1
      ? ""
      : String(currentAnswer.choiceNum)

  const answered = useMemo(
    () =>
      reviewAnswers.map(
        (a) =>
          a.answer !== undefined && a.answer?.trim() !== ""
      ),
    [reviewAnswers]
  )
  return (
    <div className="space-y-6">
      {/* Question Notes (Header Navigation) */}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {reviewQuestions.map((q, index) => (
          <Button
            key={index}
            variant={"outline"}
            size="sm"
            className="shrink-0"
            aria-current={currentQuestion === index ? "true" : undefined}
            onClick={() => setCurrentQuestion(index)}
          >
            {currentQuestion === index ? (
              <CircleDot
                className={`mr-2 h-4 w-4 ${answered[index] ? "text-primary" : "text-muted-foreground"}`}
              />
            ) : answered[index] ? (
              <Check className="mr-2 h-4 w-4 text-primary" />
            ) : (
              <Circle className="mr-2 h-4 w-4 text-muted-foreground" />
            )}

            {q.noteTitle}
          </Button>
        ))}
      </div>

      {/* Question */}

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Question {currentQuestion + 1} of {reviewQuestions.length}
        </p>

        <h2 className="text-2xl font-semibold">{question.question}</h2>
      </div>

      {/* Answers */}

      <Card>
        <CardContent className="space-y-6 pt-1">
          <RadioGroup
            value={selectedChoiceValue}
            onValueChange={(value) => {
              const answer = {
                key: question.noteTitle,
                choiceNum: Number(value),
                answer: reviewQuestions[currentQuestion].choices[value],
              }

              let shouldGoToNext = false

              const updatedAnswers = [...reviewAnswers]
              //Only move if current is empty
              if (updatedAnswers[currentQuestion].answer == undefined) {
                shouldGoToNext = true
              }
              updatedAnswers[currentQuestion] = answer

              updateAnswer(answer)
              if (shouldGoToNext) {
                goToNextQuestion(updatedAnswers)
              }
            }}
          >
            <div className="space-y-3">
              {question.choices.map((choice, index) => (
                <Label
                  key={index}
                  htmlFor={`choice-${index}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <RadioGroupItem
                    id={`choice-${index}`}
                    value={index.toString()}
                  />

                  <span>
                    {String.fromCharCode(65 + index)}) {choice}
                  </span>
                </Label>
              ))}
            </div>
          </RadioGroup>

          <div className="space-y-3 pt-0">
            <Label>Or enter your own answer</Label>

            <Input
              placeholder="Type your answer..."
              value={currentAnswer.choiceNum == -1 ? currentAnswer.answer : ""}
              onChange={(e) =>
                updateAnswer({
                  key: question.noteTitle,
                  answer: e.target.value,
                  choiceNum: -1,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={currentQuestion === 0}
          onClick={() => setCurrentQuestion((q) => q - 1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          variant="outline"
          disabled={currentQuestion === reviewQuestions.length - 1}
          onClick={() => setCurrentQuestion((q) => q + 1)}
        >
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
