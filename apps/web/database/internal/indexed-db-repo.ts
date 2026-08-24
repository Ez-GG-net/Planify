import { SchedulePlanSchema } from "@planify/schemas"
import type { SchedulePlan } from "@planify/types"

import { database } from "./database"
import type { StorageRepository } from "./types"

//!TEMPORARY IMPLEMENTATION UNTIL A SERVER-SIDE STORAGE IS IMPLEMENTED
export const indexedDBScheduleRepository: StorageRepository = {
  async getSchedules() {
    const schedules = await database.schedules.toArray()

    //returns and excludes any invalid schedules from the database
    return schedules.filter((schedule) =>
      SchedulePlanSchema.safeParse(schedule).success
    )
  },

  async getSchedule(id) {
    const schedule = await database.schedules.get(id)

    if (schedule == null) {
      return null
    }

    const result = SchedulePlanSchema.safeParse(schedule)

    return result.success ? result.data : null
  },

  async saveSchedule(schedule: SchedulePlan) {
    //throws an error if the schedule is malformed
    SchedulePlanSchema.parse(schedule)

    //saves the schedule to the database
    await database.schedules.put(schedule)
  },

  async deleteSchedule(id) {
    await database.schedules.delete(id)
  },
}