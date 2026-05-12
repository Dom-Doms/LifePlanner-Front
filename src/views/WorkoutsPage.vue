<template>
  <AppLayout>
    <section class="page-header page-header--row">
      <div>
        <h1>Allenamento</h1>
        <p>Schede riutilizzabili e sessioni giornaliere.</p>
      </div>
      <RouterLink class="icon-btn" to="/workouts/new">+</RouterLink>
    </section>

    <section class="workout-list">
      <WorkoutCard
        v-for="template in workouts.templates"
        :key="template.id"
        :title="template.name"
        :description="template.description"
        :count="template.exercises.length"
      >
        <div class="card-actions">
          <RouterLink class="secondary-btn" :to="`/workouts/${template.id}`">Modifica</RouterLink>
          <button class="secondary-btn" type="button" @click="assignToday(template.id)">Oggi</button>
          <button class="danger-btn" type="button" @click="workouts.removeTemplate(template.id)">Elimina</button>
        </div>
      </WorkoutCard>
      <p v-if="!workouts.templates.length" class="empty-state">Nessuna scheda presente.</p>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import AppLayout from '@/components/AppLayout.vue';
import WorkoutCard from '@/components/WorkoutCard.vue';
import { useWorkoutStore } from '@/stores/workoutStore';
import { todayIso } from '@/utils/date';

const workouts = useWorkoutStore();

const assignToday = async (templateId: number) => {
  await workouts.assignFromTemplate({ templateId, date: todayIso(), title: null, notes: '', participants: [] });
};

onMounted(workouts.loadTemplates);
</script>
