import { Schedule, SchedulePlan } from "@planify/types";
import { api } from "@/lib/api/client";

export function generateSchedulePlan(
    schedule: Schedule,
    signal?: AbortSignal
) {
    return api<SchedulePlan>("/generate/schedule", {
        method: "POST",
        body: JSON.stringify(schedule),
        signal,
        errorMessage: "Failed to create schedule",
    });
}
