import { httpScheduleRepository } from "./internal/http-repo"

export function getScheduleRepository() {
  return httpScheduleRepository
}