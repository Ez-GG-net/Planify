import { api } from "./client"
import type { CancellationUsageResponse } from "@planify/types"

export async function fetchCancellationUsage(): Promise<CancellationUsageResponse> {
  return api<CancellationUsageResponse>("/rate-limits/cancellations", {
    fallbackErrorMessage: "Failed to load cancellation allowance",
  })
}