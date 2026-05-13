export type UserRole = 'ADMIN' | 'USER';
export type EventType = 'STUDY' | 'EXAM' | 'PERSONAL' | 'GYM' | 'WORKOUT' | 'OTHER';
export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type ParticipantType = 'REGISTERED_USER' | 'FREE_TEXT';

export interface UserResponse {
  id: number;
  username: string;
  displayName?: string | null;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface DayContextResponse {
  id: number;
  label: string;
  color?: string | null;
  emoji?: string | null;
  active: boolean;
}

export interface DayContextRequest {
  label: string;
  color?: string | null;
  emoji?: string | null;
  active?: boolean;
}

export interface DailyPlanResponse {
  id: number;
  date: string;
  context?: DayContextResponse | null;
  notes?: string | null;
}

export interface DailyPlanRequest {
  contextId?: number | null;
  notes?: string | null;
  recurrenceType?: RecurrenceType | null;
  recurrenceUntil?: string | null;
}

export interface ParticipantDto {
  id?: number | null;
  registeredUserId?: number | null;
  displayName: string;
  participantType: ParticipantType;
}

export interface CalendarEventResponse {
  id: number;
  title: string;
  description?: string | null;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  allDay: boolean;
  type: EventType;
  location?: string | null;
  color?: string | null;
  workoutSessionId?: number | null;
  workoutTemplateId?: number | null;
  recurrenceType?: RecurrenceType | null;
  recurrenceUntil?: string | null;
  reminderEnabled: boolean;
  reminderMinutesBefore?: number | null;
  reminderSentAt?: string | null;
  participants: ParticipantDto[];
}

export type CalendarEventRequest = Omit<CalendarEventResponse, 'id' | 'reminderSentAt'>;

export interface WorkoutExerciseDto {
  id?: number | null;
  name: string;
  muscleGroup?: string | null;
  sets?: number | null;
  reps?: string | null;
  suggestedWeight?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
  exerciseOrder: number;
}

export interface WorkoutTemplateResponse {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  exercises: WorkoutExerciseDto[];
}

export interface WorkoutTemplateRequest {
  name: string;
  description?: string | null;
  exercises: WorkoutExerciseDto[];
}

export interface WorkoutParticipantDto {
  id?: number | null;
  userId?: number | null;
  displayName: string;
  participantType: ParticipantType;
}

export interface WorkoutSessionExerciseDto {
  id?: number | null;
  name: string;
  muscleGroup?: string | null;
  plannedSets?: number | null;
  plannedReps?: string | null;
  plannedWeight?: string | null;
  actualSets?: number | null;
  actualReps?: string | null;
  actualWeight?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
  exerciseOrder: number;
}

export interface WorkoutSessionResponse {
  id: number;
  date: string;
  templateId?: number | null;
  title: string;
  notes?: string | null;
  participants: WorkoutParticipantDto[];
  exercises: WorkoutSessionExerciseDto[];
}

export interface WorkoutSessionRequest {
  date: string;
  templateId?: number | null;
  title: string;
  notes?: string | null;
  participants: WorkoutParticipantDto[];
  exercises: WorkoutSessionExerciseDto[];
}

export interface WorkoutFromTemplateRequest {
  templateId: number;
  date: string;
  title?: string | null;
  notes?: string | null;
  participants: WorkoutParticipantDto[];
}
