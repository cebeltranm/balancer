export function parseLocalDateString(value?: string) {
  if (!value) {
    return new Date();
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isFutureLocalDate(date: Date) {
  const today = new Date();
  return (
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() >
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  );
}
