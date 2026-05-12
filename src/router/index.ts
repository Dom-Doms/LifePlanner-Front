import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { todayIso } from '@/utils/date';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: () => `/day/${todayIso()}` },
    { path: '/login', name: 'login', component: () => import('@/views/LoginPage.vue'), meta: { public: true } },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterPage.vue'), meta: { public: true } },
    { path: '/day', redirect: () => `/day/${todayIso()}` },
    { path: '/day/:date', name: 'day', component: () => import('@/views/DayPage.vue') },
    { path: '/week', name: 'week', component: () => import('@/views/WeekPage.vue') },
    { path: '/calendar', name: 'calendar', component: () => import('@/views/CalendarPage.vue') },
    { path: '/workouts', name: 'workouts', component: () => import('@/views/WorkoutsPage.vue') },
    { path: '/workouts/:id', name: 'workout-editor', component: () => import('@/views/WorkoutEditorPage.vue') },
    { path: '/profile', name: 'profile', component: () => import('@/views/ProfilePage.vue') },
    { path: '/settings', redirect: '/profile' },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.public && auth.isAuthenticated) {
    return `/day/${todayIso()}`;
  }
  return true;
});

export default router;
