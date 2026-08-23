"use client"

import { useState } from "react"
import { Accordion } from "@/components/ui/accordion"

import type { TaskGuide, TaskGuideStep } from "@/types"

import { TaskGuideStep as TaskGuideStepElement } from "./task-guide-step"

interface TaskGuideStepsProps {
  steps: TaskGuide["steps"]
  onToggleStep: (stepId: TaskGuideStep["id"]) => void
  onStepChange: (index: number) => void
}

export function TaskGuideSteps({
  steps,
  onToggleStep,
  onStepChange,
}: TaskGuideStepsProps) {
  const [openStepId, setOpenStepId] = useState<number | undefined>(() => {
    const firstIncompleteStep = steps.find((step) => !step.completedAt)

    return firstIncompleteStep?.id ?? steps[steps.length - 1]?.id
  })

  function handleToggleStep(stepId: TaskGuideStep["id"]) {
    const stepIndex = steps.findIndex((step) => step.id === stepId)

    const step = steps[stepIndex]

    if (!step) {
      return
    }

    const isCompleted = Boolean(step.completedAt)

    // Persist the completion state.
    onToggleStep(stepId)

    // Only advance when changing:
    // incomplete -> complete
    if (!isCompleted) {
      // Open the next step that isn't already completed,
      // skipping steps the user has finished before.
      const nextStep = steps
        .slice(stepIndex + 1)
        .find((candidate) => !Boolean(candidate.completedAt))

      if (nextStep) {
        setOpenStepId(nextStep.id)
        onStepChange(
          steps.findIndex((candidate) => candidate.id === nextStep.id)
        )
      }
    }
  }

  return (
    <Accordion
      value={[openStepId]}
      onValueChange={(value) => {
        const stepId = value[0]

        setOpenStepId(stepId)

        if (stepId != null) {
          const index = steps.findIndex((step) => step.id === stepId)

          if (index >= 0) {
            onStepChange(index)
          }
        }
      }}
      className="w-full"
    >
      {steps.map((step, index) => (
        <TaskGuideStepElement
          key={step.id}
          step={step}
          index={index}
          onToggle={handleToggleStep}
        />
      ))}
    </Accordion>
  )
}
