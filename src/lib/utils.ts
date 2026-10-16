// Haftaning dushanba kunini qaytaradi
export function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Dushanbaga to'g'rilash
  return new Date(date.setDate(diff)).toISOString().split('T')[0];
}

// Sana formatlash (DD.MM.YYYY)
export function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
}

// Hafta kunlari (Dushanba - Juma)
export const WEEK_DAYS = [
  { key: 'Mon', label: 'Dushanba' },
  { key: 'Tue', label: 'Seshanba' },
  { key: 'Wed', label: 'Chorshanba' },
  { key: 'Thu', label: 'Payshanba' },
  { key: 'Fri', label: 'Juma' },
];