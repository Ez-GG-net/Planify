import type { IDv1, SchedulePlan } from "@planify/types"

import { getScheduleRepository } from "@/database"

export async function addSchedulePlan(plan: SchedulePlan) {
  await getScheduleRepository().saveSchedule(plan)
}

export async function getSchedulePlan(id: IDv1) {
  return getScheduleRepository().getSchedule(id)
}