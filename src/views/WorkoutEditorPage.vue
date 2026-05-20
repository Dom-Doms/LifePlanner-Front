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
      <template v-for="item in orderedDraftItems" :key="`${item.type}-${item.index}`">
        <article
          v-if="item.type === 'step'"
          class="workout-step-row"
          :class="`workout-step-row--${item.step.stepType.toLowerCase()}`"
        >
          <button type="button" @click="editTopStep(item.index)">
            <strong>{{ item.step.name }}</strong>
            <span>{{ stepLabel(item.step) }}</span>
          </button>
          <button class="danger-btn" type="button" @click="removeTopStep(item.index)">Rimuovi</button>
        </article>

        <article v-else class="workout-block-editor">
        <div class="workout-block-editor__header">
          <div>
            <input v-model.trim="item.block.title" placeholder="Titolo gruppo" />
            <small>{{ formatWorkoutDuration(estimateWorkoutBlockSeconds(item.block)) }}</small>
          </div>
          <label>
            <span>Serie</span>
            <input v-model.number="item.block.repeatCount" type="number" min="1" max="99" />
          </label>
        </div>
        <p class="workout-block-editor__meta">x{{ normalizedRepeatCount(item.block.repeatCount) }} serie</p>
        <div class="workout-block-editor__steps">
          <button
            v-for="(step, stepIndex) in item.block.steps"
            :key="`b-${item.index}-s-${stepIndex}`"
            type="button"
            class="workout-step-pill"
            @click="editBlockStep(item.index, stepIndex)"
          >
            <strong>{{ step.name }}</strong>
            <span>{{ stepLabel(step) }}</span>
          </button>
        </div>
        <div class="card-actions card-actions--wrap">
          <button class="secondary-btn" type="button" @click="addStepToBlock(item.index, 'ACTIVE')">+ Esercizio</button>
          <button class="secondary-btn" type="button" @click="addStepToBlock(item.index, 'BREAK')">+ Recupero</button>
          <button class="danger-btn" type="button" @click="removeBlock(item.index)">Rimuovi gruppo</button>
        </div>
      </article>
      </template>

      <p v-if="!stepCount" class="empty-state">Scheda vuota. Aggiungi esercizi, recuperi o un gruppo.</p>
      <p v-if="error" class="form-alert">{{ error }}</p>
    </section>

    <div ref="addMenuRef" class="workout-fab-menu" :class="{ 'workout-fab-menu--open': isAddMenuOpen }">
      <div v-if="isAddMenuOpen" class="workout-fab-menu__options">
        <button type="button" @click="selectAddExercise">Esercizio</button>
        <button type="button" @click="selectAddBreak">Recupero</button>
        <button type="button" @click="selectAddGroup">Gruppo</button>
      </div>
      <button class="workout-fab-menu__toggle" type="button" :aria-expanded="isAddMenuOpen" @click="toggleAddMenu">
        {{ isAddMenuOpen ? 'x' : '+' }}
      </button>
    </div>

    <WorkoutStepEditor
      v-if="editing"
      :step="editing.step"
      :order="editing.order"
      @close="editing = null"
      @save="saveStep"
    />

    <div v-if="quickBreak" class="modal-backdrop" @click.self="closeQuickBreak">
      <form class="modal quick-break-modal" @submit.prevent="saveQuickBreak">
        <div class="modal-header">
          <div>
            <h2>Recupero</h2>
            <p>Imposta solo la durata.</p>
          </div>
          <button class="icon-btn icon-btn--light" type="button" @click="closeQuickBreak">x</button>
        </div>
        <div class="quick-break-presets">
          <button v-for="preset in breakPresets" :key="preset.seconds" type="button" @click="setQuickBreakSeconds(preset.seconds)">
            {{ preset.label }}
          </button>
        </div>
        <div class="form-grid">
          <label class="form-field">
            <span class="field-label">Minuti</span>
            <input v-model.number="quickBreak.minutes" type="number" min="0" max="30" />
          </label>
          <label class="form-field">
            <span class="field-label">Secondi</span>
            <input v-model.number="quickBreak.seconds" type="number" min="0" max="59" />
          </label>
        </div>
        <p v-if="quickBreak.error" class="form-alert">{{ quickBreak.error }}</p>
        <div class="modal-actions">
          <button class="secondary-btn" type="button" @click="closeQuickBreak">Annulla</button>
          <button class="primary-btn" type="submit">Salva recupero</button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import WorkoutStepEditor from '@/components/WorkoutStepEditor.vue';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { WorkoutBlockDto, WorkoutStepDto, WorkoutStepType, WorkoutTemplateRequest } from '@/types/api';
import { estimateWorkoutBlockSeconds, estimateWorkoutStepSeconds, formatWorkoutDuration } from '@/utils/workoutDuration';

type EditingTarget = { blockIndex: number | null; stepIndex: number | null; step: WorkoutStepDto; order: number };
type QuickBreakTarget = { blockIndex: number | null; minutes: number; seconds: number; error: string };
type DraftItem =
  | { type: 'step'; index: number; sortOrder: number; step: WorkoutStepDto }
  | { type: 'block'; index: number; sortOrder: number; block: WorkoutBlockDto };

const route = useRoute();
const router = useRouter();
const workouts = useWorkoutStore();
const isNew = computed(() => route.name === 'workout-new');
const numericId = computed(() => Number(route.params.id));
const editing = ref<EditingTarget | null>(null);
const error = ref('');
const isAddMenuOpen = ref(false);
const addMenuRef = ref<HTMLElement | null>(null);
const quickBreak = ref<QuickBreakTarget | null>(null);
const breakPresets = [
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1m', seconds: 60 },
  { label: '1m30', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
];

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
  const top = (draft.steps ?? []).reduce((sum, step) => sum + estimateWorkoutStepSeconds(step), 0);
  const grouped = (draft.blocks ?? []).reduce((sum, block) => sum + estimateWorkoutBlockSeconds(block), 0);
  return top + grouped;
});
const durationLabel = computed(() => formatWorkoutDuration(estimatedDuration.value));
const orderedDraftItems = computed<DraftItem[]>(() => [
  ...(draft.steps ?? []).map((step, index) => ({ type: 'step' as const, index, sortOrder: step.sortOrder, step })),
  ...(draft.blocks ?? []).map((block, index) => ({ type: 'block' as const, index, sortOrder: block.sortOrder, block })),
].sort((a, b) => a.sortOrder - b.sortOrder));

const nextGlobalOrder = () => orderedDraftItems.value.length;

const normalizedRepeatCount = (value?: number | null) => Math.min(99, Math.max(1, Number(value) || 1));

const makeStep = (type: WorkoutStepType, order: number): WorkoutStepDto => ({
  name: type === 'BREAK' ? 'Recupero' : '',
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
  const order = nextGlobalOrder();
  editing.value = { blockIndex: null, stepIndex: null, step: makeStep(type, order), order };
};

const addStepToBlock = (blockIndex: number, type: WorkoutStepType) => {
  const order = draft.blocks?.[blockIndex]?.steps.length ?? 0;
  editing.value = { blockIndex, stepIndex: null, step: makeStep(type, order), order };
};

const toggleAddMenu = () => {
  isAddMenuOpen.value = !isAddMenuOpen.value;
};

const closeAddMenu = () => {
  isAddMenuOpen.value = false;
};

const selectAddExercise = () => {
  closeAddMenu();
  addTopStep('ACTIVE');
};

const selectAddBreak = () => {
  closeAddMenu();
  addTopStep('BREAK');
};

const selectAddGroup = () => {
  closeAddMenu();
  addBlock();
};

const openQuickBreak = (blockIndex: number | null) => {
  quickBreak.value = { blockIndex, minutes: 0, seconds: 45, error: '' };
};

const closeQuickBreak = () => {
  quickBreak.value = null;
};

const setQuickBreakSeconds = (total: number) => {
  if (!quickBreak.value) return;
  quickBreak.value.minutes = Math.floor(total / 60);
  quickBreak.value.seconds = total % 60;
  quickBreak.value.error = '';
};

const saveQuickBreak = () => {
  if (!quickBreak.value) return;
  const totalSeconds = (Number(quickBreak.value.minutes) || 0) * 60 + (Number(quickBreak.value.seconds) || 0);
  if (totalSeconds <= 0) {
    quickBreak.value.error = 'La durata deve essere maggiore di zero.';
    return;
  }
  if (totalSeconds > 1800) {
    quickBreak.value.error = 'La durata massima consentita e 30 minuti.';
    return;
  }
  const block = quickBreak.value.blockIndex === null ? null : draft.blocks?.[quickBreak.value.blockIndex];
  const order = block ? block.steps.length : draft.steps?.length ?? 0;
  const step: WorkoutStepDto = {
    ...makeStep('BREAK', order),
    name: 'Recupero',
    durationSeconds: totalSeconds,
  };
  if (block) {
    block.steps.push(step);
  } else {
    draft.steps?.push(step);
  }
  closeQuickBreak();
};

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!isAddMenuOpen.value) return;
  const target = event.target;
  if (target instanceof Node && addMenuRef.value?.contains(target)) return;
  closeAddMenu();
};

const editTopStep = (stepIndex: number) => {
  const step = draft.steps?.[stepIndex];
  if (step) editing.value = { blockIndex: null, stepIndex, step: { ...step }, order: step.sortOrder };
};

const removeTopStep = (stepIndex: number) => {
  draft.steps?.splice(stepIndex, 1);
};

const removeBlock = (blockIndex: number) => {
  draft.blocks?.splice(blockIndex, 1);
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
    sortOrder: nextGlobalOrder(),
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
  orderedDraftItems.value.forEach((item, globalIndex) => {
    if (item.type === 'step') {
      item.step.sortOrder = globalIndex;
      return;
    }
    item.block.sortOrder = globalIndex;
  });
  draft.steps = (draft.steps ?? []).map((step) => ({ ...step }));
  draft.blocks = (draft.blocks ?? []).map((block) => ({
    ...block,
    repeatCount: normalizedRepeatCount(block.repeatCount),
    steps: block.steps.map((step, stepIndex) => ({ ...step, sortOrder: stepIndex })),
  }));
  const saved = await workouts.saveTemplate(draft, isNew.value ? undefined : numericId.value);
  await router.push(`/workouts/${saved.id}`);
};

onMounted(async () => {
  document.addEventListener('pointerdown', handleDocumentPointerDown);
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

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
});
</script>
