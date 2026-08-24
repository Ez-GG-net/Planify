import Dexie, { type EntityTable } from "dexie"
import type { SchedulePlan } from "@planify/types"

export class PlanifyDatabase extends Dexie {
  schedules!: EntityTable<SchedulePlan, "id">

  constructor() {
    super("planify")

    //!Change this version number when changing the database schema
    this.version(1).stores({
      schedules: "id, title, startDate, endDate",
    })
  }
}

export const database = new PlanifyDatabase()