/** Formats minutes-from-midnight (e.g. 900) as a 12-hour clock label ("3:00 PM"). */
export function minutesToTimeLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const period = hours >= 12 ? "PM" : "AM"
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${mins.toString().padStart(2, "0")} ${period}`
}

/** Formats a duration in minutes as "30m", "1h 30m", etc. */
export function minutesToDurationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
