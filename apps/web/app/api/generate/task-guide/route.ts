import { generateRandomIDv1 } from "@/lib/create-id"
import { SchedulePlanTask, TaskGuide, TaskGuideStep } from "@planify/types"

export async function POST(request: Request) {
  const body: SchedulePlanTask = await request.json()

  console.log("Received schedule:", body)

  //fake waiting time
  await new Promise((resolve) => setTimeout(resolve, 500))

  const PLACEHOLDER_TASK_GUIDE = {
    description: "Learn basic French greetings",
    objective:
      "By the end of this task, you should be able to introduce yourself and use three basic greetings.",
    steps: [
      {
        title: "Learn 3 basic greetings",
        content: `### Bonjour

**Bonjour** means "hello" and can also be used for good morning or good afternoon.

### Bonsoir

**Bonsoir** means "good evening."

### Salut

**Salut** means "hi" and is more casual.

> ðŸ’¡ Use **bonjour** when you're unsure which greeting to use.
     `,
        estimatedDuration: 5,
      },
      {
        title: "Practice introducing yourself",
        content: `
Learn this basic pattern:

\`\`\`
Bonjour, je m'appelle [name].
\`\`\`

This means:

> Hello, my name is [name].

Try saying it out loud several times to become comfortable saying it in person.
      `,
        estimatedDuration: 10,
      },
    ],
  }

  //adding unique ID for each step
  const updatedSteps = PLACEHOLDER_TASK_GUIDE.steps.map((step, index) => ({
    id: index,
    ...step,
  }))

  const taskGuide: TaskGuide = {
    ...PLACEHOLDER_TASK_GUIDE,
    steps: updatedSteps,
  }

  return Response.json(taskGuide)
}
