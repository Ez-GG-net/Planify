import { SchedulePlan } from "@/types"

export interface StorageRepository {
  getSchedules(): Promise<SchedulePlan[]>
  getSchedule(id: string): Promise<SchedulePlan | null>
  saveSchedule(schedule: SchedulePlan): Promise<void>
  deleteSchedule(id: string): Promise<void>
}