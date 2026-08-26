import type { SchedulePlan } from "@planify/types"

import { api } from "@/lib/api/client"
import type { StorageRepository } from "./types"

/**
 * Server-backed schedule repository. Every call hits the Hono API, which
 * enforces user ownership server-side. Replaces the previous IndexedDB
 * implementation (now kept as a fallback for offline usage if needed).
 */
export const httpScheduleRepository: StorageRepository = {
  async getSchedules() {
    return api<SchedulePlan[]>("/schedules")
  },

  async getSchedule(id) {
    try {
      return await api<SchedulePlan>(`/schedules/${id}`)
    } catch {
      // 404 from the API — the repo contract expects null, not an error
      return null
    }
  },

  async saveSchedule(schedule: SchedulePlan) {
    // Try update first; if 404, create.
    // The API uses PUT for update and POST for create.
    try {
      await api<SchedulePlan>(`/schedules/${schedule.id}`, {
        method: "PUT",
        body: JSON.stringify(schedule),
        errorMessage: "Failed to update schedule",
      })
    } catch {
      // Either network error or 404 — try create
      await api<SchedulePlan>("/schedules", {
        method: "POST",
        body: JSON.stringify(schedule),
        errorMessage: "Failed to save schedule",
      })
    }
  },

  async deleteSchedule(id) {
    await api(`/schedules/${id}`, {
      method: "DELETE",
      errorMessage: "Failed to delete schedule",
    })
  },
}
