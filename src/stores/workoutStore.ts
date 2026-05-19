import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  cancelWorkoutRun,
  completeWorkoutRun,
  createWorkoutSessionFromTemplate,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutRun,
  getWorkoutSessions,
  getWorkoutSessionsByDate,
  getWorkoutTemplates,
  pauseWorkoutRun,
  resumeWorkoutRun,
  startWorkoutRun,
  updateWorkoutRunState,
  updateWorkoutTemplate,
} from '@/api/workoutsApi';
import type {
  WorkoutFromTemplateRequest,
  WorkoutRunResponse,
  WorkoutRunStateRequest,
  WorkoutSessionResponse,
  WorkoutTemplateRequest,
  WorkoutTemplateResponse,
} from '@/types/api';

export const useWorkoutStore = defineStore('workouts', () => {
  const templates = ref<WorkoutTemplateResponse[]>([]);
  const sessions = ref<WorkoutSessionResponse[]>([]);
  const daySessions = ref<WorkoutSessionResponse[]>([]);
  const activeRun = ref<WorkoutRunResponse | null>(null);

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

  const loadRun = async (runId: number) => {
    activeRun.value = await getWorkoutRun(runId);
    return activeRun.value;
  };

  const startRun = async (templateId: number, workoutSessionId?: number | null) => {
    activeRun.value = await startWorkoutRun(templateId, workoutSessionId);
    return activeRun.value;
  };

  const updateRunState = async (runId: number, payload: WorkoutRunStateRequest) => {
    activeRun.value = await updateWorkoutRunState(runId, payload);
    return activeRun.value;
  };

  const pauseRun = async (runId: number, payload?: WorkoutRunStateRequest) => {
    if (payload) {
      await updateWorkoutRunState(runId, payload);
    }
    activeRun.value = await pauseWorkoutRun(runId);
    return activeRun.value;
  };

  const resumeRun = async (runId: number) => {
    activeRun.value = await resumeWorkoutRun(runId);
    return activeRun.value;
  };

  const completeRun = async (runId: number, payload: WorkoutRunStateRequest) => {
    activeRun.value = await completeWorkoutRun(runId, payload);
    return activeRun.value;
  };

  const cancelRun = async (runId: number) => {
    activeRun.value = await cancelWorkoutRun(runId);
    return activeRun.value;
  };

  return {
    templates,
    sessions,
    daySessions,
    activeRun,
    loadTemplates,
    saveTemplate,
    removeTemplate,
    loadSessions,
    loadDaySessions,
    assignFromTemplate,
    loadRun,
    startRun,
    updateRunState,
    pauseRun,
    resumeRun,
    completeRun,
    cancelRun,
  };
});
