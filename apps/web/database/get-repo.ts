import { indexedDBScheduleRepository } from "./internal/indexed-db-repo"

export function getScheduleRepository() {
  return indexedDBScheduleRepository
}