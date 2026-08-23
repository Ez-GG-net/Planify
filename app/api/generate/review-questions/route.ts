import { ReviewQuestion, WizardSchedule } from "@/types";

export async function POST(request: Request) {
  const body: WizardSchedule = await request.json();

  console.log("Received schedule:", body);

  //fake waiting time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const PLACEHOLDER_REVIEW_QUESTIONS = [
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
      choices: ["At the hotel", "At a resturant", "Ordering fast food"]
    }
  ]

  const schedulePlan: ReviewQuestion[] = PLACEHOLDER_REVIEW_QUESTIONS
    

  return Response.json(schedulePlan)
}