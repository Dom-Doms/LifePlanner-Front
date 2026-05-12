import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createWorkoutSessionFromTemplate,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutSessions,
  getWorkoutSessionsByDate,
  getWorkoutTemplates,
  updateWorkoutTemplate,
} from '@/api/workoutsApi';
import type {
  WorkoutFromTemplateRequest,
  WorkoutSessionResponse,
  WorkoutTemplateRequest,
  WorkoutTemplateResponse,
} from '@/types/api';

export const useWorkoutStore = defineStore('workouts', () => {
  const templates = ref<WorkoutTemplateResponse[]>([]);
  const sessions = ref<WorkoutSessionResponse[]>([]);
  const daySessions = ref<WorkoutSessionResponse[]>([]);

  const loadTemplates = async () => {
    templates.value = await getWorkoutTemplates();
  };

  const saveTemplate = async (payload: WorkoutTemplateRequest, id?: number) => {
    const saved = id ? await updateWorkoutTemplate(id, payload) : await createWorkoutTemplate(payload);
    await loadTemplates();
    return saved;
  };

  const removeTemplate = async (id: number) => {
    await deleteWorkoutTemplate(id);
    await loadTemplates();
  };

  const loadSessions = async (from: string, to: string) => {
    sessions.value = await getWorkoutSessions(from, to);
  };

  const loadDaySessions = async (date: string) => {
    daySessions.value = await getWorkoutSessionsByDate(date);
  };

  const assignFromTemplate = async (payload: WorkoutFromTemplateRequest) => {
    const saved = await createWorkoutSessionFromTemplate(payload);
    await loadDaySessions(payload.date);
    return saved;
  };

  return { templates, sessions, daySessions, loadTemplates, saveTemplate, removeTemplate, loadSessions, loadDaySessions, assignFromTemplate };
});
