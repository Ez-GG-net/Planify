import type { ReviewQuestion, WizardSchedule } from "@planify/types";

/**
 * Placeholder implementation preserved from the original Next.js route
 * handler: fixed question set after an artificial delay. Replaced by real
 * AI generation in a later phase.
 */
export async function generateReviewQuestions(
  schedule: WizardSchedule,
): Promise<ReviewQuestion[]> {
  console.log("[generate] review-questions request:", schedule);

  // Fake waiting time, matching the previous handler's behavior.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return [
    {
      question: "Where are you planning to go in France",
      noteTitle: "Places user wants to go",
      choices: ["Paris", "Bordeaux", "Nice", "French Riviera"],
    },
    {
      question: "What is your budget?",
      noteTitle: "General Budget",
      choices: ["500$", "1000$", "2000$", "4000$"],
    },
    {
      question: "Where do you prefer to eat?",
      noteTitle: "Breakfast Location Preference",
      choices: ["At the hotel", "At a resturant", "Ordering fast food"],
    },
  ];
}
