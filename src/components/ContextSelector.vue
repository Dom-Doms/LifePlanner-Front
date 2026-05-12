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
      <input v-model.trim="draft.color" placeholder="#7c3aed" />
      <input v-model.trim="draft.emoji" maxlength="20" placeholder="Icona" />
      <button class="primary-btn" type="submit">Salva</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { DayContextRequest, DayContextResponse } from '@/types/api';

defineProps<{
  contexts: DayContextResponse[];
  selectedId?: number | null;
}>();

const emit = defineEmits<{
  change: [contextId: number | null];
  create: [payload: DayContextRequest];
}>();

const showForm = ref(false);
const draft = reactive<DayContextRequest>({ label: '', color: '', emoji: '', active: true });

const submit = () => {
  emit('create', { ...draft, active: true });
  draft.label = '';
  draft.color = '';
  draft.emoji = '';
  showForm.value = false;
};
</script>
