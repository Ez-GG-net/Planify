"use client"

import { TaskGuide, TaskGuideStep } from "@planify/types"

import { TaskGuideOverview } from "./task-guide-overview"
import { TaskGuideSteps } from "./task-guide-steps"
import TaskGuideDetails from "./task-guide-details"

interface TaskGuideElementProps {
  guide: TaskGuide
  taskDetails: Record<string, unknown> | undefined
  onToggleStep: (stepId: TaskGuideStep["id"]) => void
  onStepChange: (index: number) => void
}

export function TaskGuideElement({
  guide,
  taskDetails,
  onToggleStep,
  onStepChange,
}: TaskGuideElementProps) {
  return (
    <div className="space-y-8">
      {taskDetails && (
        <TaskGuideDetails details={taskDetails} />
      )}
      <TaskGuideOverview
        description={guide.description}
        objective={guide.objective}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Steps</h2>

        <TaskGuideSteps
          steps={guide.steps}
          onToggleStep={onToggleStep}
          onStepChange={onStepChange}
        />
      </section>
    </div>
  )
}
