import type { ExecutableWorkoutStep } from '@/composables/useWorkoutRunner';

interface WorkoutStepNotification {
  title: string;
  body: string;
}

export const useWorkoutStepNotifier = () => {
  const notifyWorkoutStep = (step: ExecutableWorkoutStep) => {
    showBrowserNotification(formatStepNotification(step));
  };

  const showBrowserNotification = (notification: WorkoutStepNotification) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options = {
      body: notification.body,
      icon: '/icons/pwa-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'lifeplanner-workout-current-step',
      renotify: true,
      silent: false,
      requireInteraction: false,
      data: {
        url: `${window.location.pathname}${window.location.search}`,
        type: 'WORKOUT_STEP',
      },
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

  return {
    notifyWorkoutStep,
  };
};

export const formatStepNotification = (step: ExecutableWorkoutStep): WorkoutStepNotification => {
  const title = step.stepType === 'BREAK' ? step.name || 'Recupero' : step.name || 'Esercizio';
  if (step.stepType === 'BREAK' || step.measurementType === 'TIME') {
    return {
      title,
      body: withSeries(formatDuration(step.durationSeconds ?? 0), step),
    };
  }

  return {
    title,
    body: withSeries(`${Math.max(1, step.reps ?? 1)} reps`, step),
  };
};

const withSeries = (body: string, step: ExecutableWorkoutStep) => {
  if (!step.totalLaps || step.totalLaps <= 1) {
    return body;
  }
  return `${body} - Serie ${step.lap}/${step.totalLaps}`;
};

const formatDuration = (total: number) => {
  const safeTotal = Math.max(0, total);
  return `${String(Math.floor(safeTotal / 60)).padStart(2, '0')}:${String(safeTotal % 60).padStart(2, '0')}`;
};
