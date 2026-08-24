import { TaskState } from "@/lib/task/task-state"
import { TriangleAlert } from "lucide-react"

/** Small dot/check glyph representing a task's state. */
export function TaskStateIndicator({ state }: { state: TaskState }) {

  if (state === "completed") {
    return <span className="text-muted-foreground">✓</span>
  }

  if (state === "overdue") {
    return <TriangleAlert className="text-destructive"/>
  }

  if (state === "active") {
    return <span className="size-2.5 rounded-full bg-primary" />
  }

  return (
    <span className="size-2.5 rounded-full border border-muted-foreground/60" />
  )
}
