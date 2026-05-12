export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const todayIso = () => toIsoDate(new Date());

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
};

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T00:00:00`));

export const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`));
