import { ReviewQuestion, WizardSchedule } from "@/types";
import { api } from "@/lib/api/client";

export function generateReviewQuestions(
    schedule: WizardSchedule,
    signal?: AbortSignal
) {
    return api<ReviewQuestion[]>("/generate/review-questions", {
        method: "POST",
        body: JSON.stringify(schedule),
        signal,
        errorMessage: "Failed to generate review questions",
    });
}
