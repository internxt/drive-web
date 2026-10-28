import { useState, useEffect } from 'react';

import taskManagerService from '../services/tasks.service';
import { TaskEvent, TaskFilter, TaskNotification } from '../types';

const NOTIFICATIONS_REFRESH_INTERVAL_MS = 100;
const TASK_LIST_EVENTS = [TaskEvent.TaskAdded, TaskEvent.TaskUpdated, TaskEvent.TaskRemoved];

/**
 * Task events are coalesced into one refresh every NOTIFICATIONS_REFRESH_INTERVAL_MS: large uploads
 * emit thousands of events per second, and rebuilding the list on each one freezes the UI.
 */
export function useTaskManagerGetNotifications(filter: TaskFilter = {}): TaskNotification[] {
  const [notifications, setNotifications] = useState(() => taskManagerService.getNotifications(filter));

  useEffect(() => {
    let pendingRefresh: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefresh = () => {
      if (pendingRefresh) return;

      pendingRefresh = setTimeout(() => {
        pendingRefresh = undefined;
        setNotifications(taskManagerService.getNotifications(filter));
      }, NOTIFICATIONS_REFRESH_INTERVAL_MS);
    };

    TASK_LIST_EVENTS.forEach((event) => taskManagerService.addListener({ event, listener: scheduleRefresh }));

    return () => {
      TASK_LIST_EVENTS.forEach((event) => taskManagerService.removeListener({ event, listener: scheduleRefresh }));
      clearTimeout(pendingRefresh);
    };
  }, []);

  return notifications;
}
