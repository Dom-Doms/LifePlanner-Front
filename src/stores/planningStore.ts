import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  createDayContext,
  createEvent,
  deleteDayContext,
  deleteEvent,
  getDailyPlan,
  getDayContexts,
  getEvents,
  getMonthPlans,
  getWeekPlans,
  updateDailyPlan,
  updateDayContext,
  updateEvent,
} from '@/api/planningApi';
import type {
  CalendarEventRequest,
  CalendarEventResponse,
  DailyPlanResponse,
  DayContextRequest,
  DayContextResponse,
  RecurrenceType,
} from '@/types/api';

export const usePlanningStore = defineStore('planning', () => {
  const contexts = ref<DayContextResponse[]>([]);
  const currentPlan = ref<DailyPlanResponse | null>(null);
  const events = ref<CalendarEventResponse[]>([]);
  const weekPlans = ref<DailyPlanResponse[]>([]);
  const monthPlans = ref<DailyPlanResponse[]>([]);
  const loading = ref(false);

  const allDayEvents = computed(() => events.value.filter((event) => event.allDay));
  const timedEvents = computed(() =>
    events.value
      .filter((event) => !event.allDay)
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
  );

  const loadContexts = async () => {
    contexts.value = await getDayContexts();
  };

  const saveContext = async (payload: DayContextRequest, id?: number) => {
    const saved = id ? await updateDayContext(id, payload) : await createDayContext(payload);
    await loadContexts();
    return saved;
  };

  const removeContext = async (id: number) => {
    await deleteDayContext(id);
    await loadContexts();
  };

  const loadDay = async (date: string) => {
    loading.value = true;
    try {
      const [plan, dayEvents] = await Promise.all([getDailyPlan(date), getEvents(date, date), loadContexts()]);
      currentPlan.value = plan;
      events.value = dayEvents;
    } finally {
      loading.value = false;
    }
  };

  const setDayContext = async (
    date: string,
    contextId: number | null,
    recurrenceType: RecurrenceType = 'NONE',
    recurrenceUntil: string | null = null,
  ) => {
    currentPlan.value = await updateDailyPlan(date, {
      contextId,
      notes: currentPlan.value?.notes ?? null,
      recurrenceType,
      recurrenceUntil,
    });
  };

  const saveEvent = async (payload: CalendarEventRequest, id?: number) => {
    const saved = id ? await updateEvent(id, payload) : await createEvent(payload);
    await loadDay(payload.eventDate);
    return saved;
  };

  const removeEvent = async (date: string, id: number) => {
    await deleteEvent(id);
    await loadDay(date);
  };

  const loadWeek = async (startDate: string, endDate: string) => {
    const [plans, rangeEvents] = await Promise.all([getWeekPlans(startDate), getEvents(startDate, endDate)]);
    weekPlans.value = plans;
    events.value = rangeEvents;
  };

  const loadMonth = async (year: number, month: number, from: string, to: string) => {
    const [plans, rangeEvents] = await Promise.all([getMonthPlans(year, month), getEvents(from, to)]);
    monthPlans.value = plans;
    events.value = rangeEvents;
  };

  return {
    contexts,
    currentPlan,
    events,
    weekPlans,
    monthPlans,
    loading,
    allDayEvents,
    timedEvents,
    loadContexts,
    saveContext,
    removeContext,
    loadDay,
    setDayContext,
    saveEvent,
    removeEvent,
    loadWeek,
    loadMonth,
  };
});
