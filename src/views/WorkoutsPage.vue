<template>
  <AppLayout>
    <section class="page-header page-header--row">
      <div>
        <h1>Allenamento</h1>
        <p>Schede riutilizzabili e sessioni giornaliere</p>
      </div>
      <RouterLink class="icon-btn" to="/workouts/new">+</RouterLink>
    </section>

    <section class="panel workout-search-panel">
      <input v-model.trim="query" type="search" placeholder="Cerca scheda, descrizione, esercizio" />
      <p v-if="feedback" class="success-text">{{ feedback }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </section>

    <section class="workout-list">
      <RouterLink
        v-for="template in filteredTemplates"
        :key="template.id"
        :to="`/workouts/${template.id}`"
        class="workout-card-link"
      >
        <WorkoutCard
          :title="template.name"
          :description="template.description"
          :count="countSteps(template)"
          :groups="template.blocks?.length ?? 0"
          :duration-seconds="estimateWorkoutTemplateSeconds(template)"
        >
          <div class="workout-card__footer">
            <span v-if="template.updatedAt">Aggiornata {{ formatDate(template.updatedAt) }}</span>
            <span v-else>Pronta da usare</span>
            <strong>Apri</strong>
          </div>
        </WorkoutCard>
      </RouterLink>
      <p v-if="!filteredTemplates.length" class="empty-state">Nessuna scheda presente. Crea la prima con il pulsante +.</p>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppLayout from '@/components/AppLayout.vue';
import WorkoutCard from '@/components/WorkoutCard.vue';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { WorkoutTemplateResponse } from '@/types/api';
import { estimateWorkoutTemplateSeconds } from '@/utils/workoutDuration';

const workouts = useWorkoutStore();
const query = ref('');
const feedback = ref('');
const error = ref('');

const filteredTemplates = computed(() => {
  const needle = query.value.toLowerCase();
  if (!needle) return workouts.templates;
  return workouts.templates.filter((template) => searchableText(template).includes(needle));
});

const searchableText = (template: WorkoutTemplateResponse) => {
  const legacy = template.exercises.map((exercise) => `${exercise.name} ${exercise.muscleGroup ?? ''}`).join(' ');
  const blocks = (template.blocks ?? [])
    .map((block) => `${block.title} ${block.steps.map((step) => step.name).join(' ')}`)
    .join(' ');
  const steps = (template.steps ?? []).map((step) => step.name).join(' ');
  return `${template.name} ${template.description ?? ''} ${legacy} ${blocks} ${steps}`.toLowerCase();
};

const countSteps = (template: WorkoutTemplateResponse) => {
  const advancedCount = (template.steps?.length ?? 0) + (template.blocks ?? []).reduce((sum, block) => sum + block.steps.length, 0);
  return advancedCount || template.exercises.length;
};

const formatDate = (value: string) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(value));

onMounted(async () => {
  try {
    await workouts.loadTemplates();
  } catch (err) {
    error.value = 'Non riesco a caricare le schede allenamento.';
  }
});
</script>
