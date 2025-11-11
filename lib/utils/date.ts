/**
 * Получает текущую дату в локальном времени в формате ISO "YYYY-MM-DD"
 */
export function getTodayLocalISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

