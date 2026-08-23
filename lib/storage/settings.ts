const SETTINGS_PREFIX = "planify.settings."

export function getSetting<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null
  }

  const value = window.localStorage.getItem(
    `${SETTINGS_PREFIX}${key}`
  )

  if (value == null) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function setSetting<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    `${SETTINGS_PREFIX}${key}`,
    JSON.stringify(value)
  )
}