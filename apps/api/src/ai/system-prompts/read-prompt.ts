import { readFile } from "fs/promises"
import path from "path"

type ChatPromptName = "chat.task-guide" | "chat.task" | "chat.pre-task"

/**
 * Resolves prompt files relative to this module so the lookup works no
 * matter which directory the API server is started from.
 */
const PROMPTS_DIR = path.join(import.meta.dirname, ".")

export async function getTaskGuideChatSystemPrompt(
  prompt_name: ChatPromptName
) {
  return readFile(path.join(PROMPTS_DIR, `${prompt_name}.md`), "utf8")
}
