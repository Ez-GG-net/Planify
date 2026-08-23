"use client"

import { useState } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { generatePreTaskGuide } from "@/lib/api/pre-task-guide"
import { TaskState } from "@/lib/task/task-state"
import { PreTaskGuide } from "@/types"
import { TaskStateIndicator } from "./task-state-indicator"
import { useSchedulePlanList } from "./schedule-plan-context"

export function PreTaskAccordion() {
  const { preTasks, completedIds, toggleTask } = useSchedulePlanList()

  const [openId, setOpenId] = useState<string | null>(null)
  const [guides, setGuides] = useState<Record<string, PreTaskGuide>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  const firstUncompletedId =
    preTasks.find((task) => !completedIds.has(task.id))?.id ?? null

  function loadGuide(taskId: string) {
    const task = preTasks.find((t) => t.id === taskId)
    if (!task) return

    setLoadingId(taskId)
    setErrorId(null)

    generatePreTaskGuide(task)
      .then((guide) => {
        setGuides((prev) => ({ ...prev, [taskId]: guide }))
      })
      .catch(() => {
        setErrorId(taskId)
      })
      .finally(() => {
        setLoadingId((current) => (current === taskId ? null : current))
      })
  }

  // Clicking a row only expands/collapses it (never toggles completion).
  function handleValueChange(value: string[]) {
    const nextOpenId = value[0] ?? null
    setOpenId(nextOpenId)
    if (nextOpenId && !guides[nextOpenId] && loadingId !== nextOpenId) {
      loadGuide(nextOpenId)
    }
  }

  if (preTasks.length === 0) return null

  return (
    <Accordion
      value={openId ? [openId] : []}
      onValueChange={handleValueChange}
      className="max-w-148 rounded-lg border"
    >
      {preTasks.map((task) => {
        const isCompleted = completedIds.has(task.id)
        const state: TaskState = isCompleted
          ? "completed"
          : task.id === firstUncompletedId
            ? "active"
            : "upcoming"

        return (
          <AccordionItem key={task.id} value={task.id}>
            <ContextMenu>
              <ContextMenuTrigger className="block">
                <AccordionTrigger className="gap-2 px-3 py-3 items-center">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-flex w-4 shrink-0 items-center justify-center"
                    >
                      <TaskStateIndicator state={state} />
                    </span>
                    <span
                      className={`truncate text-sm font-medium w-100 ${
                        isCompleted
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </span>
                  </span>
                </AccordionTrigger>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => toggleTask(task.id)}>
                  {isCompleted ? "Mark as incomplete" : "Complete"}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            <AccordionContent className="px-3">
              <div className="space-y-3 pt-2">
                {loadingId === task.id ? (
                  <div
                    className="space-y-2 pl-4"
                    role="status"
                    aria-label="Loading task guide"
                  >
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : errorId === task.id ? (
                  <div className="flex items-center gap-2 text-sm text-destructive pl-4">
                    <span>Failed to load the task guide.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadGuide(task.id)}
                    >
                      Try again
                    </Button>
                  </div>
                ) : guides[task.id] ? (
                  <TaskGuideContent guide={guides[task.id]} />
                ) : null}

                <div className="flex items-center justify-start border-t pt-3">
                  <Button
                    variant={isCompleted ? "ghost" : "outline"}
                    size="sm"
                    onClick={() => toggleTask(task.id)}
                  >
                    {isCompleted ? "Mark as incomplete" : "Mark as complete"}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

function TaskGuideContent({ guide }: { guide: PreTaskGuide }) {
  return (
    <div className="space-y-3 pl-6">
      {guide.description && (
        <p className="text-sm text-muted-foreground">{guide.description}</p>
      )}

      {guide.steps.length > 0 && (
        <ol className="space-y-3">
          {guide.steps.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">
                {index + 1}.
              </span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                {step.description && (
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}


    </div>
  )
}
