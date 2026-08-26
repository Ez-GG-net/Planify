import { QuotaUsage } from "@/lib/api/quota"

const NEAR_LIMIT_OFFSET = 2

export function QuotaHint({ quota }: { quota: QuotaUsage }) {
  const schedule = quota.schedule_plan
  const review = quota.review_questions

  const scheduleRemaining = schedule
    ? schedule.limit - schedule.used
    : null

  const reviewRemaining = review
    ? review.limit - review.used
    : null

  const showSchedule =
    scheduleRemaining !== null &&
    scheduleRemaining <= NEAR_LIMIT_OFFSET

  const showReview =
    reviewRemaining !== null &&
    reviewRemaining <= NEAR_LIMIT_OFFSET

  if (!showSchedule && !showReview) {
    return null
  }

  return (
    <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
      {showSchedule && (
        <span>
          {scheduleRemaining} schedule{" "}
          {scheduleRemaining === 1 ? "plan" : "plans"} remaining
        </span>
      )}

      {showReview && (
        <span>
          {reviewRemaining} review{" "}
          {reviewRemaining === 1 ? "question" : "questions"} remaining
        </span>
      )}
    </div>
  )
}