<template>
  <section class="panel">
    <div class="panel__header">
      <h2>Contesto giornata</h2>
      <button class="icon-btn" type="button" @click="showForm = !showForm">+</button>
    </div>
    <div class="chips">
      <button
        type="button"
        class="context-chip"
        :class="{ 'context-chip--active': !selectedId }"
        @click="$emit('change', null)"
      >
        Nessuno
      </button>
      <button
        v-for="context in contexts.filter((item) => item.active)"
        :key="context.id"
        type="button"
        class="context-chip"
        :class="{ 'context-chip--active': selectedId === context.id }"
        :style="{ borderColor: context.color ?? undefined }"
        @click="$emit('change', context.id)"
      >
        <span>{{ context.emoji }}</span>
        {{ context.label }}
      </button>
    </div>
    <form v-if="showForm" class="inline-form" @submit.prevent="submit">
      <input v-model.trim="draft.label" required placeholder="Nuovo contesto" />
      <input v-model.trim="draft.color" type="color" aria-label="Colore contesto" />
      <input v-model.trim="draft.emoji" maxlength="20" placeholder="Icona" />
      <button class="primary-btn" type="submit">Salva</button>
    </form>
    <div v-if="selectedId" class="inline-form">
      <select v-model="recurrenceType">
        <option value="NONE">Solo questo giorno</option>
        <option value="DAILY">Ogni giorno</option>
        <option value="WEEKLY">Ogni settimana</option>
        <option value="BIWEEKLY">Ogni due settimane</option>
        <option value="MONTHLY">Ogni mese</option>
      </select>
      <input v-if="recurrenceType !== 'NONE'" v-model="recurrenceUntil" type="date" />
      <button class="secondary-btn" type="button" @click="applySelected">Applica contesto</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { DayContextRequest, DayContextResponse, RecurrenceType } from '@/types/api';

const props = defineProps<{
  contexts: DayContextResponse[];
  selectedId?: number | null;
}>();

const emit = defineEmits<{
  change: [contextId: number | null, recurrenceType?: RecurrenceType, recurrenceUntil?: string | null];
  create: [payload: DayContextRequest];
}>();

const showForm = ref(false);
const draft = reactive<DayContextRequest>({ label: '', color: '#2563eb', emoji: '', active: true });
const recurrenceType = ref<RecurrenceType>('NONE');
const recurrenceUntil = ref<string | null>(null);

const submit = () => {
  emit('create', { ...draft, active: true });
  draft.label = '';
  draft.color = '';
  draft.emoji = '';
  showForm.value = false;
};

const applySelected = () => {
  emit('change', props.selectedId ?? null, recurrenceType.value, recurrenceUntil.value);
};
</script>
