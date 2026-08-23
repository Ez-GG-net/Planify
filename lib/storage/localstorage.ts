import { getStorageKey, storageKeys } from "."

// These helpers are called during render from client component
function canUseLocalStorage() {
  return typeof localStorage !== "undefined"
}

export function setStorageItem<T>(
  key: keyof typeof storageKeys,
  value: T
) {
  if (!canUseLocalStorage()) return

  localStorage.setItem(
    getStorageKey(key),
    JSON.stringify(value)
  )
}

export function getStorageItem<T>(
  key: keyof typeof storageKeys
): T | null {
  if (!canUseLocalStorage()) return null

  const item = localStorage.getItem(getStorageKey(key))

  if (!item) return null

  try {
    return JSON.parse(item) as T
  } catch {
    return null
  }
}

export function removeStorageItem(
  key: keyof typeof storageKeys
) {
  if (!canUseLocalStorage()) return

  localStorage.removeItem(getStorageKey(key))
}

