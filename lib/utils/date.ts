/**
 * Получает текущую дату в локальном времени в формате ISO "YYYY-MM-DD"
 */
export function getTodayLocalISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/**
 * Вычисляет локальную дату из UTC datetime и timezone
 * @param utcDateTime ISO datetime string в UTC (например "2025-12-11T19:00:00.000Z")
 * @param timezone IANA timezone (например "Europe/Moscow")
 * @returns ISO date string "YYYY-MM-DD" в локальном времени timezone
 */
export function getLocalDateFromUTC(utcDateTime: string, timezone: string): string {
  try {
    const date = new Date(utcDateTime)
    // 'en-CA' locale возвращает формат YYYY-MM-DD
    return date.toLocaleDateString('en-CA', { timeZone: timezone })
  } catch (error) {
    console.error('[getLocalDateFromUTC] Failed to convert date:', error)
    // Fallback: используем локальное время браузера
    const date = new Date(utcDateTime)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }
}

