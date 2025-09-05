export function formatNotificationDate(createdAt) {
  const date = new Date(createdAt);
  // Adjust for local timezone offset
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log(formatNotificationDate);