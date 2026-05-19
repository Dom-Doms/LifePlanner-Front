<template>
  <AppLayout>
    <section class="workout-editor-header">
      <button class="icon-btn icon-btn--light" type="button" @click="router.back()">‹</button>
      <strong>{{ isNew ? 'Nuova scheda' : 'Modifica scheda' }}</strong>
      <button class="primary-btn workout-save-btn" type="button" @click="save">Salva</button>
    </section>

    <section class="panel workout-title-panel">
      <input v-model.trim="draft.name" class="workout-title-input" required placeholder="Nome workout" />
      <textarea v-model.trim="draft.description" placeholder="Descrizione"></textarea>
      <div class="workout-summary-grid">
        <span><strong>{{ durationLabel }}</strong><small>Durata</small></span>
        <span><strong>{{ stepCount }}</strong><small>Esercizi</small></span>
        <span><strong>{{ groupCount }}</strong><small>Gruppi</small></span>
      </div>
    </section>

    <section class="workout-builder">
      <article v-for="(step, index) in draft.steps" :key="`s-${index}`" class="workout-step-row" :class="`workout-step-row--${step.stepType.toLowerCase()}`">
        <button type="button" @click="editTopStep(index)">
          <strong>{{ step.name }}</strong>
          <span>{{ stepLabel(step) }}</span>
        </button>
        <button class="danger-btn" type="button" @click="draft.steps?.splice(index, 1)">Rimuovi</button>
      </article>

      <article v-for="(block, blockIndex) in draft.blocks" :key="`b-${blockIndex}`" class="workout-block-editor">
        <div class="workout-block-editor__header">
          <input v-model.trim="block.title" placeholder="Titolo gruppo" />
          <label>
            <span>Lap</span>
            <input v-model.number="block.repeatCount" type="number" min="1" />
          </label>
        </div>
        <div class="workout-block-editor__steps">
          <button
            v-for="(step, stepIndex) in block.steps"
            :key="`b-${blockIndex}-s-${stepIndex}`"
            type="button"
            class="workout-step-pill"
            @click="editBlockStep(blockIndex, stepIndex)"
          >
            <strong>{{ step.name }}</strong>
            <span>{{ stepLabel(step) }}</span>
          </button>
        </div>
        <div class="card-actions card-actions--wrap">
          <button class="secondary-btn" type="button" @click="addStepToBlock(blockIndex, 'ACTIVE')">+ Esercizio</button>
          <button class="secondary-btn" type="button" @click="addStepToBlock(blockIndex, 'BREAK')">+ Recupero</button>
          <button class="danger-btn" type="button" @click="draft.blocks?.splice(blockIndex, 1)">Rimuovi gruppo</button>
        </div>
      </article>

      <p v-if="!stepCount" class="empty-state">Scheda vuota. Aggiungi esercizi, recuperi o un gruppo.</p>
      <p v-if="error" class="form-alert">{{ error }}</p>
    </section>

    <div class="workout-fab-menu">
      <button type="button" @click="addTopStep('ACTIVE')">Esercizio</button>
      <button type="button" @click="addTopStep('BREAK')">Recupero</button>
      <button type="button" @click="addBlock">Gruppo</button>
    </div>

    <WorkoutStepEditor
      v-if="editing"
      :step="editing.step"
      :order="editing.order"
      @close="editing = null"
      @save="saveStep"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import WorkoutStepEditor from '@/components/WorkoutStepEditor.vue';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { WorkoutBlockDto, WorkoutStepDto, WorkoutStepType, WorkoutTemplateRequest } from '@/types/api';

type EditingTarget = { blockIndex: number | null; stepIndex: number | null; step: WorkoutStepDto; order: number };

const route = useRoute();
const router = useRouter();
const workouts = useWorkoutStore();
const isNew = computed(() => route.name === 'workout-new');
const numericId = computed(() => Number(route.params.id));
const editing = ref<EditingTarget | null>(null);
const error = ref('');

const draft = reactive<WorkoutTemplateRequest>({
  name: '',
  description: '',
  estimatedDurationSeconds: 0,
  exercises: [],
  blocks: [],
  steps: [],
});

const stepCount = computed(() => (draft.steps?.length ?? 0) + (draft.blocks ?? []).reduce((sum, block) => sum + block.steps.length, 0));
const groupCount = computed(() => draft.blocks?.length ?? 0);
const estimatedDuration = computed(() => {
  const top = (draft.steps ?? []).reduce((sum, step) => sum + (step.durationSeconds ?? 0), 0);
  const grouped = (draft.blocks ?? []).reduce((sum, block) => {
    const blockSeconds = block.steps.reduce((stepSum, step) => stepSum + (step.durationSeconds ?? 0), 0);
    return sum + blockSeconds * Math.max(1, block.repeatCount || 1);
  }, 0);
  return top + grouped;
});
const durationLabel = computed(() => `${Math.max(1, Math.round(estimatedDuration.value / 60))} min`);

const makeStep = (type: WorkoutStepType, order: number): WorkoutStepDto => ({
  name: type === 'BREAK' ? 'Break' : '',
  description: '',
  stepType: type,
  measurementType: type === 'BREAK' ? 'TIME' : 'REPS',
  durationSeconds: type === 'BREAK' ? 30 : null,
  reps: type === 'ACTIVE' ? 10 : null,
  sortOrder: order,
  color: type === 'BREAK' ? 'var(--workout-break)' : 'var(--workout-active)',
  intensity: '',
  active: true,
});

const addTopStep = (type: WorkoutStepType) => {
  editing.value = { blockIndex: null, stepIndex: null, step: makeStep(type, draft.steps?.length ?? 0), order: draft.steps?.length ?? 0 };
};

const addStepToBlock = (blockIndex: number, type: WorkoutStepType) => {
  const order = draft.blocks?.[blockIndex]?.steps.length ?? 0;
  editing.value = { blockIndex, stepIndex: null, step: makeStep(type, order), order };
};

const editTopStep = (stepIndex: number) => {
  const step = draft.steps?.[stepIndex];
  if (step) editing.value = { blockIndex: null, stepIndex, step: { ...step }, order: stepIndex };
};

const editBlockStep = (blockIndex: number, stepIndex: number) => {
  const step = draft.blocks?.[blockIndex]?.steps[stepIndex];
  if (step) editing.value = { blockIndex, stepIndex, step: { ...step }, order: stepIndex };
};

const saveStep = (step: WorkoutStepDto) => {
  if (!editing.value) return;
  if (editing.value.blockIndex === null) {
    if (editing.value.stepIndex === null) draft.steps?.push(step);
    else draft.steps?.splice(editing.value.stepIndex, 1, step);
  } else {
    const block = draft.blocks?.[editing.value.blockIndex];
    if (editing.value.stepIndex === null) block?.steps.push(step);
    else block?.steps.splice(editing.value.stepIndex, 1, step);
  }
  editing.value = null;
};

const addBlock = () => {
  const block: WorkoutBlockDto = {
    title: 'Nuovo gruppo',
    sortOrder: draft.blocks?.length ?? 0,
    repeatCount: 2,
    color: 'var(--app-accent)',
    collapsed: false,
    steps: [],
  };
  draft.blocks?.push(block);
};

const stepLabel = (step: WorkoutStepDto) => {
  if (step.stepType === 'BREAK') return formatSeconds(step.durationSeconds ?? 0);
  if (step.measurementType === 'TIME') return formatSeconds(step.durationSeconds ?? 0);
  return `x${step.reps ?? 0} reps`;
};

const formatSeconds = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

const save = async () => {
  if (!draft.name.trim()) {
    error.value = 'Il nome scheda e obbligatorio.';
    return;
  }
  draft.estimatedDurationSeconds = estimatedDuration.value;
  draft.steps = (draft.steps ?? []).map((step, index) => ({ ...step, sortOrder: index }));
  draft.blocks = (draft.blocks ?? []).map((block, blockIndex) => ({
    ...block,
    sortOrder: blockIndex,
    repeatCount: Math.max(1, block.repeatCount || 1),
    steps: block.steps.map((step, stepIndex) => ({ ...step, sortOrder: stepIndex })),
  }));
  const saved = await workouts.saveTemplate(draft, isNew.value ? undefined : numericId.value);
  await router.push(`/workouts/${saved.id}`);
};

onMounted(async () => {
  if (!isNew.value) {
    const current = await import('@/api/workoutsApi').then((api) => api.getWorkoutTemplate(numericId.value));
    draft.name = current.name;
    draft.description = current.description ?? '';
    draft.estimatedDurationSeconds = current.estimatedDurationSeconds ?? 0;
    draft.exercises = current.exercises.map((exercise) => ({ ...exercise }));
    draft.blocks = (current.blocks ?? []).map((block) => ({ ...block, steps: block.steps.map((step) => ({ ...step })) }));
    draft.steps = (current.steps ?? []).map((step) => ({ ...step }));
    if (!draft.steps.length && !draft.blocks.length && draft.exercises.length) {
      draft.steps = draft.exercises.map((exercise, index) => ({
        name: exercise.name,
        description: exercise.notes,
        stepType: 'ACTIVE',
        measurementType: 'REPS',
        reps: Number.parseInt(exercise.reps ?? '', 10) || 1,
        durationSeconds: null,
        sortOrder: index,
        color: 'var(--workout-active)',
        intensity: exercise.muscleGroup,
        active: true,
      }));
    }
  }
});
</script>
