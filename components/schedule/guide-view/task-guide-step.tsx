"use client"

import { Check, Clock } from "lucide-react"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Button } from "@/components/ui/button"
import { MarkdownContent } from "@/components/markdown-content"
import type { TaskGuideStep as TaskGuideStepType } from "@/types"

interface TaskGuideStepProps {
  step: TaskGuideStepType
  index: number
  onToggle: (stepId: TaskGuideStepType["id"]) => void
}

export function TaskGuideStep({
  step,
  index,
  onToggle,
}: TaskGuideStepProps) {
  const isCompleted = Boolean(step.completedAt)

  return (
    <AccordionItem
      value={step.id}
      className="border rounded-xl hover:bg-muted/50"
      data-highlight-id={step.id}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <AccordionTrigger
            className="items-start px-3 py-4 text-left hover:no-underline"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3 pr-3">
              <div
                className={`mt-0 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  index + 1
                )}
              </div>

              <div className="min-w-0 flex-1 mt-1">
                <div className="flex items-start justify-between gap-4">
                  <h2
                    className={`text-base font-semibold leading-6 ${
                      isCompleted
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </h2>

                  <div className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    <span>{step.estimatedDuration} min</span>
                  </div>
                </div>
              </div>
            </div>
          </AccordionTrigger>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={() => onToggle(step.id)}>
            {isCompleted ? "Mark as incomplete" : "Complete"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {step.content && (
        <AccordionContent className="px-3 pb-4 pl-14">
          <MarkdownContent>{step.content}</MarkdownContent>

          <Button
            variant={isCompleted ? "outline" : "default"}
            size="sm"
            className="mt-6"
            onClick={() => onToggle(step.id)}
          >
            {isCompleted ? (
              <>
                <Check className="size-4" />
                Completed
              </>
            ) : (
              "Complete step"
            )}
          </Button>
        </AccordionContent>
      )}
    </AccordionItem>
  )
}