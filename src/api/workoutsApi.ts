import { httpClient } from './httpClient';
import type {
  WorkoutFromTemplateRequest,
  WorkoutSessionRequest,
  WorkoutSessionResponse,
  WorkoutTemplateRequest,
  WorkoutTemplateResponse,
} from '@/types/api';

export const getWorkoutTemplates = async () => {
  const { data } = await httpClient.get<WorkoutTemplateResponse[]>('/workout-templates');
  return data;
};

export const getWorkoutTemplate = async (id: number) => {
  const { data } = await httpClient.get<WorkoutTemplateResponse>(`/workout-templates/${id}`);
  return data;
};

export const createWorkoutTemplate = async (payload: WorkoutTemplateRequest) => {
  const { data } = await httpClient.post<WorkoutTemplateResponse>('/workout-templates', payload);
  return data;
};

export const updateWorkoutTemplate = async (id: number, payload: WorkoutTemplateRequest) => {
  const { data } = await httpClient.put<WorkoutTemplateResponse>(`/workout-templates/${id}`, payload);
  return data;
};

export const deleteWorkoutTemplate = async (id: number) => {
  await httpClient.delete(`/workout-templates/${id}`);
};

export const getWorkoutSessions = async (from: string, to: string) => {
  const { data } = await httpClient.get<WorkoutSessionResponse[]>('/workout-sessions', { params: { from, to } });
  return data;
};

export const getWorkoutSessionsByDate = async (date: string) => {
  const { data } = await httpClient.get<WorkoutSessionResponse[]>(`/workout-sessions/date/${date}`);
  return data;
};

export const createWorkoutSession = async (payload: WorkoutSessionRequest) => {
  const { data } = await httpClient.post<WorkoutSessionResponse>('/workout-sessions', payload);
  return data;
};

export const updateWorkoutSession = async (id: number, payload: WorkoutSessionRequest) => {
  const { data } = await httpClient.put<WorkoutSessionResponse>(`/workout-sessions/${id}`, payload);
  return data;
};

export const deleteWorkoutSession = async (id: number) => {
  await httpClient.delete(`/workout-sessions/${id}`);
};

export const createWorkoutSessionFromTemplate = async (payload: WorkoutFromTemplateRequest) => {
  const { data } = await httpClient.post<WorkoutSessionResponse>('/workout-sessions/from-template', payload);
  return data;
};
