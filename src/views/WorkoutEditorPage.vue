<template>
  <AppLayout>
    <section class="page-header">
      <h1>{{ isNew ? 'Nuova scheda' : 'Modifica scheda' }}</h1>
      <p>Organizza esercizi, serie e recuperi.</p>
    </section>
    <form class="panel editor-form" @submit.prevent="save">
      <input v-model.trim="draft.name" required placeholder="Nome scheda" />
      <textarea v-model.trim="draft.description" placeholder="Descrizione"></textarea>
      <div class="panel__header">
        <h2>Esercizi</h2>
        <button class="icon-btn" type="button" @click="addExercise">+</button>
      </div>
      <article v-for="(exercise, index) in draft.exercises" :key="index" class="exercise-row">
        <input v-model.trim="exercise.name" required placeholder="Esercizio" />
        <input v-model.trim="exercise.muscleGroup" placeholder="Gruppo" />
        <div class="form-grid">
          <input v-model.number="exercise.sets" type="number" min="1" placeholder="Serie" />
          <input v-model.trim="exercise.reps" placeholder="Rip." />
        </div>
        <div class="form-grid">
          <input v-model.trim="exercise.suggestedWeight" placeholder="Peso" />
          <input v-model.number="exercise.restSeconds" type="number" min="0" placeholder="Recupero sec." />
        </div>
        <textarea v-model.trim="exercise.notes" placeholder="Note"></textarea>
        <button class="danger-btn" type="button" @click="draft.exercises.splice(index, 1)">Rimuovi</button>
      </article>
      <button class="primary-btn" type="submit">Salva scheda</button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { WorkoutTemplateRequest } from '@/types/api';

const route = useRoute();
const router = useRouter();
const workouts = useWorkoutStore();
const isNew = computed(() => route.params.id === 'new');
const numericId = computed(() => Number(route.params.id));

const draft = reactive<WorkoutTemplateRequest>({
  name: '',
  description: '',
  exercises: [],
});

const addExercise = () => {
  draft.exercises.push({
    name: '',
    muscleGroup: '',
    sets: 3,
    reps: '8-12',
    suggestedWeight: '',
    restSeconds: 90,
    notes: '',
    exerciseOrder: draft.exercises.length,
  });
};

const save = async () => {
  draft.exercises = draft.exercises.map((exercise, index) => ({ ...exercise, exerciseOrder: index }));
  await workouts.saveTemplate(draft, isNew.value ? undefined : numericId.value);
  await router.push('/workouts');
};

onMounted(async () => {
  await workouts.loadTemplates();
  if (!isNew.value) {
    const current = workouts.templates.find((template) => template.id === numericId.value);
    if (current) {
      draft.name = current.name;
      draft.description = current.description ?? '';
      draft.exercises = current.exercises.map((exercise) => ({ ...exercise }));
    }
  }
  if (!draft.exercises.length) addExercise();
});
</script>
