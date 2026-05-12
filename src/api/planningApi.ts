import { httpClient } from './httpClient';
import type {
  CalendarEventRequest,
  CalendarEventResponse,
  DailyPlanRequest,
  DailyPlanResponse,
  DayContextRequest,
  DayContextResponse,
} from '@/types/api';

export const getDayContexts = async () => {
  const { data } = await httpClient.get<DayContextResponse[]>('/day-contexts');
  return data;
};

export const createDayContext = async (payload: DayContextRequest) => {
  const { data } = await httpClient.post<DayContextResponse>('/day-contexts', payload);
  return data;
};

export const updateDayContext = async (id: number, payload: DayContextRequest) => {
  const { data } = await httpClient.put<DayContextResponse>(`/day-contexts/${id}`, payload);
  return data;
};

export const deleteDayContext = async (id: number) => {
  await httpClient.delete(`/day-contexts/${id}`);
};

export const getDailyPlan = async (date: string) => {
  const { data } = await httpClient.get<DailyPlanResponse>(`/daily-plans/date/${date}`);
  return data;
};

export const updateDailyPlan = async (date: string, payload: DailyPlanRequest) => {
  const { data } = await httpClient.put<DailyPlanResponse>(`/daily-plans/date/${date}`, payload);
  return data;
};

export const getWeekPlans = async (startDate: string) => {
  const { data } = await httpClient.get<DailyPlanResponse[]>('/daily-plans/week', { params: { startDate } });
  return data;
};

export const getMonthPlans = async (year: number, month: number) => {
  const { data } = await httpClient.get<DailyPlanResponse[]>('/daily-plans/month', { params: { year, month } });
  return data;
};

export const getEvents = async (from: string, to: string) => {
  const { data } = await httpClient.get<CalendarEventResponse[]>('/events', { params: { from, to } });
  return data;
};

export const createEvent = async (payload: CalendarEventRequest) => {
  const { data } = await httpClient.post<CalendarEventResponse>('/events', payload);
  return data;
};

export const updateEvent = async (id: number, payload: CalendarEventRequest) => {
  const { data } = await httpClient.put<CalendarEventResponse>(`/events/${id}`, payload);
  return data;
};

export const deleteEvent = async (id: number) => {
  await httpClient.delete(`/events/${id}`);
};
