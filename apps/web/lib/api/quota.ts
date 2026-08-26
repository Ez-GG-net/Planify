import { api } from "./client"

export type QuotaUsage = Record<string, { used: number; limit: number }>

export async function fetchQuotaUsage(): Promise<QuotaUsage> {
  return api<QuotaUsage>("/quota", {
    fallbackErrorMessage: "Failed to load quota usage",
  })
}
