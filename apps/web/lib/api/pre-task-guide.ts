import { PreTaskGuide, SchedulePlanTask } from "@planify/types";
import { api } from "@/lib/api/client";

export function generatePreTaskGuide(
    task: SchedulePlanTask,
    signal?: AbortSignal
) {
    return api<PreTaskGuide>("/generate/pre-task-guide", {
        method: "POST",
        body: JSON.stringify(task),
        signal,
        fallbackErrorMessage: "Failed to generate pre-task guide",
    });
}
