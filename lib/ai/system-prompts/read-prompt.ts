import { readFile } from "fs/promises"
import path from "path"

type ChatPromptName = "chat.task-guide" | "chat.task" | "chat.pre-task"

export async function getTaskGuideChatSystemPrompt(
  prompt_name: ChatPromptName
) {
  return readFile(
    path.join(process.cwd(), `lib/ai/system-prompts/${prompt_name}.md`),
    "utf8"
  )
}
