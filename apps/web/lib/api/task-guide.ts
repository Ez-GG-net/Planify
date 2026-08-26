import { SchedulePlanTask, TaskGuide } from "@planify/types";
import { api } from "@/lib/api/client";

export function generateTaskGuide(
    task: SchedulePlanTask,
    signal?: AbortSignal
) {
    return api<TaskGuide>("/generate/task-guide", {
        method: "POST",
        body: JSON.stringify(task),
        signal,
        fallbackErrorMessage: "Failed to generate task guide",
    });
}
