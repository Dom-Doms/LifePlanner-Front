<template>
  <section class="day-context">
    <div class="day-context__heading">
      <h2>Contesto giornata</h2>
    </div>
    <button class="day-context-card" type="button" @click="modalOpen = true">
      <span v-if="selectedContext" class="day-context-card__main">
        <span class="context-dot" :style="{ backgroundColor: selectedContext.color ?? fallbackColor }"></span>
        <span class="day-context-card__label">
          <small>{{ selectedContext.emoji || 'Contesto' }}</small>
          {{ selectedContext.label }}
        </span>
      </span>
      <span v-else class="day-context-card__main">
        <span class="context-dot context-dot--empty">+</span>
        <span class="day-context-card__label">
          <small>Nessun contesto</small>
          Imposta contesto
        </span>
      </span>
      <span class="day-context-card__action">{{ selectedContext ? 'Modifica' : 'Imposta' }}</span>
    </button>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
        <section class="modal day-context-modal" role="dialog" aria-modal="true" aria-labelledby="context-modal-title">
          <div class="modal-header">
            <div>
              <h2 id="context-modal-title">Contesto giornata</h2>
              <p>Scegli il contesto per questa giornata.</p>
            </div>
            <button class="icon-btn icon-btn--light" type="button" aria-label="Chiudi" @click="closeModal">x</button>
          </div>

          <div class="context-list">
            <button
              type="button"
              class="context-option"
              :class="{ 'context-option--active': !selectedId }"
              @click="applyContext(null)"
            >
              <span class="context-dot context-dot--empty">-</span>
              <span>Nessuno</span>
            </button>
            <button
              v-for="context in activeContexts"
              :key="context.id"
              type="button"
              class="context-option"
              :class="{ 'context-option--active': selectedId === context.id }"
              @click="applyContext(context.id)"
            >
              <span class="context-dot" :style="{ backgroundColor: context.color ?? fallbackColor }"></span>
              <span>{{ context.emoji }} {{ context.label }}</span>
            </button>
          </div>

          <div class="context-recurrence">
            <select v-model="recurrenceType" aria-label="Ripetitivita contesto">
              <option value="NONE">Solo questo giorno</option>
              <option value="DAILY">Ogni giorno</option>
              <option value="WEEKLY">Ogni settimana</option>
              <option value="BIWEEKLY">Ogni due settimane</option>
              <option value="MONTHLY">Ogni mese</option>
            </select>
            <input v-if="recurrenceType !== 'NONE'" v-model="recurrenceUntil" type="date" aria-label="Ripeti fino al" />
          </div>

          <button class="secondary-btn secondary-btn--full" type="button" @click="showForm = !showForm">
            {{ showForm ? 'Annulla nuovo contesto' : 'Nuovo contesto' }}
          </button>

          <form v-if="showForm" class="context-form" @submit.prevent="submit">
            <input v-model.trim="draft.label" required placeholder="Nome contesto" />
            <div class="color-picker" aria-label="Colore contesto">
              <button
                v-for="color in palette"
                :key="color"
                type="button"
                class="color-picker__swatch"
                :class="{ 'color-picker__swatch--active': draft.color === color }"
                :style="{ backgroundColor: color }"
                :aria-label="`Seleziona colore ${color}`"
                @click="draft.color = color"
              ></button>
            </div>
            <input v-model.trim="draft.emoji" maxlength="20" placeholder="Icona o emoji opzionale" />
            <button class="primary-btn primary-btn--full" type="submit">Salva e applica</button>
          </form>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { DayContextRequest, DayContextResponse, RecurrenceType } from '@/types/api';

const props = defineProps<{
  contexts: DayContextResponse[];
  selectedId?: number | null;
}>();

const emit = defineEmits<{
  change: [contextId: number | null, recurrenceType?: RecurrenceType, recurrenceUntil?: string | null];
  create: [payload: DayContextRequest];
}>();

const fallbackColor = '#2563eb';
const palette = ['#2563eb', '#7c3aed', '#db2777', '#16a34a', '#f97316', '#dc2626', '#64748b'];
const modalOpen = ref(false);
const showForm = ref(false);
const draft = reactive<DayContextRequest>({ label: '', color: fallbackColor, emoji: '', active: true });
const recurrenceType = ref<RecurrenceType>('NONE');
const recurrenceUntil = ref<string | null>(null);

const activeContexts = computed(() => props.contexts.filter((item) => item.active));
const selectedContext = computed(() => props.contexts.find((item) => item.id === props.selectedId) ?? null);

const closeModal = () => {
  modalOpen.value = false;
  showForm.value = false;
};

const applyContext = (contextId: number | null) => {
  emit('change', contextId, recurrenceType.value, recurrenceUntil.value);
  closeModal();
};

const submit = () => {
  emit('create', { ...draft, color: draft.color || fallbackColor, emoji: draft.emoji || null, active: true });
  draft.label = '';
  draft.color = fallbackColor;
  draft.emoji = '';
  closeModal();
};
</script>
