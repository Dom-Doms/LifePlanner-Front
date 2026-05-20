import { computed, onUnmounted, ref } from 'vue';
import type { ExecutableWorkoutStep } from '@/composables/useWorkoutRunner';

interface WorkoutStepNotification {
  title: string;
  body: string;
  stepType: ExecutableWorkoutStep['stepType'];
}

const bannerDurationMs = 2800;

export const useWorkoutStepNotifier = () => {
  const banner = ref<WorkoutStepNotification | null>(null);
  let bannerTimeout: number | undefined;

  const bannerTone = computed(() => (banner.value?.stepType === 'BREAK' ? 'break' : 'active'));

  const notifyWorkoutStep = (step: ExecutableWorkoutStep) => {
    const notification = formatStepNotification(step);
    if (document.visibilityState === 'visible') {
      showInAppBanner(notification);
      return;
    }
    showBrowserNotification(notification);
  };

  const showInAppBanner = (notification: WorkoutStepNotification) => {
    if (bannerTimeout !== undefined) {
      window.clearTimeout(bannerTimeout);
    }
    banner.value = notification;
    bannerTimeout = window.setTimeout(() => {
      banner.value = null;
      bannerTimeout = undefined;
    }, bannerDurationMs);
  };

  const showBrowserNotification = (notification: WorkoutStepNotification) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      showInAppBanner(notification);
      return;
    }

    const options = {
      body: notification.body,
      icon: '/icons/pwa-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'lifeplanner-workout-current-step',
      renotify: true,
      silent: false,
      data: { url: window.location.pathname },
    } as NotificationOptions & { renotify: boolean };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(notification.title, options))
        .catch(() => {
          new Notification(notification.title, options);
        });
      return;
    }

    new Notification(notification.title, options);
  };

  onUnmounted(() => {
    if (bannerTimeout !== undefined) {
      window.clearTimeout(bannerTimeout);
    }
  });

  return {
    banner,
    bannerTone,
    notifyWorkoutStep,
  };
};

export const formatStepNotification = (step: ExecutableWorkoutStep): WorkoutStepNotification => {
  const title = step.stepType === 'BREAK' ? step.name || 'Recupero' : step.name || 'Esercizio';
  if (step.stepType === 'BREAK' || step.measurementType === 'TIME') {
    return {
      title,
      body: formatDuration(step.durationSeconds ?? 0),
      stepType: step.stepType,
    };
  }

  return {
    title,
    body: `${Math.max(1, step.reps ?? 1)} reps`,
    stepType: step.stepType,
  };
};

const formatDuration = (total: number) => {
  const safeTotal = Math.max(0, total);
  return `${String(Math.floor(safeTotal / 60)).padStart(2, '0')}:${String(safeTotal % 60).padStart(2, '0')}`;
};
