import type { SchedulePlanTask, TaskGuide } from "@planify/types";

/**
 * Placeholder implementation preserved from the original Next.js route
 * handler: fixed French-greetings guide after an artificial delay.
 * Replaced by real AI generation in a later phase.
 */
export async function generateTaskGuide(
  task: SchedulePlanTask,
): Promise<TaskGuide> {
  console.log("Received schedule:", task);

  //fake waiting time
  await new Promise((resolve) => setTimeout(resolve, 500));

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
  };

  //adding unique ID for each step
  const updatedSteps = PLACEHOLDER_TASK_GUIDE.steps.map((step, index) => ({
    id: index,
    ...step,
  }));

  const taskGuide: TaskGuide = {
    ...PLACEHOLDER_TASK_GUIDE,
    steps: updatedSteps,
  };

  return taskGuide;
}
