import type { PreTaskGuide, SchedulePlanTask } from "@planify/types";

/**
 * Placeholder implementation preserved from the original Next.js route
 * handler: fixed hotel-booking pre-task guide after an artificial delay.
 * Replaced by real AI generation in a later phase.
 */
export async function generatePreTaskGuide(
  task: SchedulePlanTask,
): Promise<PreTaskGuide> {
  console.log("Received schedule:", task);

  //fake waiting time
  await new Promise((resolve) => setTimeout(resolve, 500));

  const PLACEHOLDER_PRETASK_GUIDE = {
    description: "Booking a hotel in St. Bueve",

    steps: [
      {
        title: "Go to https://www.booking.com/hotel/fr/le-sainte-beuve.html",
        description: "idk",
      },
    ],
  };

  const preTaskGuide: PreTaskGuide = PLACEHOLDER_PRETASK_GUIDE;

  return preTaskGuide;
}
