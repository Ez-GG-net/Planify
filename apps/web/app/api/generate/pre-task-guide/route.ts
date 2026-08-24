import { PreTaskGuide, SchedulePlanTask } from "@planify/types";

export async function POST(request: Request) {
  const body: SchedulePlanTask = await request.json();

  console.log("Received schedule:", body);

  //fake waiting time
  await new Promise((resolve) => setTimeout(resolve, 500));

  const PLACEHOLDER_PRETASK_GUIDE = {
     description: "Booking a hotel in St. Bueve",
    
    steps: [    
     {
      title: "Go to https://www.booking.com/hotel/fr/le-sainte-beuve.html",
      description: "idk",
     }
    ],
  }

  const preTaskGuide: PreTaskGuide = PLACEHOLDER_PRETASK_GUIDE

  return Response.json(preTaskGuide)
}