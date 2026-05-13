<template>
  <AppLayout>
    <section class="page-header page-header--row">
      <div>
        <h1>Allenamento</h1>
        <p>Schede riutilizzabili e sessioni giornaliere.</p>
      </div>
      <RouterLink class="icon-btn" to="/workouts/new">+</RouterLink>
    </section>

    <section class="panel">
      <input v-model.trim="query" type="search" placeholder="Cerca allenamento, descrizione o gruppo muscolare" />
      <p v-if="feedback" class="success-text">{{ feedback }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </section>

    <section class="workout-list">
      <WorkoutCard
        v-for="template in filteredTemplates"
        :key="template.id"
        :title="template.name"
        :description="template.description"
        :count="template.exercises.length"
      >
        <div class="card-actions">
          <RouterLink class="secondary-btn" :to="`/workouts/${template.id}`">Modifica</RouterLink>
          <button class="secondary-btn" type="button" @click="assignToday(template.id)">Oggi</button>
          <button class="danger-btn" type="button" @click="removeTemplate(template.id)">Elimina</button>
        </div>
      </WorkoutCard>
      <p v-if="!filteredTemplates.length" class="empty-state">Nessuna scheda presente.</p>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppLayout from '@/components/AppLayout.vue';
import WorkoutCard from '@/components/WorkoutCard.vue';
import { useWorkoutStore } from '@/stores/workoutStore';
import { todayIso } from '@/utils/date';
import { getErrorMessage } from '@/utils/errorMessage';

const workouts = useWorkoutStore();
const query = ref('');
const feedback = ref('');
const error = ref('');

const filteredTemplates = computed(() => {
  const needle = query.value.toLowerCase();
  if (!needle) return workouts.templates;
  return workouts.templates.filter((template) => {
    const exerciseText = template.exercises.map((exercise) => `${exercise.name} ${exercise.muscleGroup ?? ''}`).join(' ');
    return `${template.name} ${template.description ?? ''} ${exerciseText}`.toLowerCase().includes(needle);
  });
});

const assignToday = async (templateId: number) => {
  try {
    await workouts.assignFromTemplate({ templateId, date: todayIso(), title: null, notes: '', participants: [] });
    feedback.value = 'Allenamento aggiunto a oggi.';
    error.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  }
};

const removeTemplate = async (templateId: number) => {
  try {
    await workouts.removeTemplate(templateId);
    feedback.value = 'Allenamento archiviato o eliminato correttamente.';
    error.value = '';
  } catch (err) {
    error.value = getErrorMessage(err) || 'Non puoi eliminare questo allenamento perche e gia presente in una o piu giornate.';
  }
};

onMounted(workouts.loadTemplates);
</script>
