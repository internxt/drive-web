import { useState, useEffect } from 'react';

import taskManagerService from '../services/tasks.service';
import { TaskEvent, TaskFilter, TaskNotification } from '../types';

export function useTaskManagerGetNotifications(filter: TaskFilter = {}): TaskNotification[] {
  const [notifications, setNotifications] = useState(taskManagerService.getNotifications(filter));
  const onTaskAdded = () => {
    setNotifications(taskManagerService.getNotifications(filter));
  };
  const onTaskUpdated = () => {
    setNotifications(taskManagerService.getNotifications(filter));
  };
  const onTaskRemoved = () => {
    setNotifications(taskManagerService.getNotifications(filter));
  };

  useEffect(() => {
    taskManagerService.addListener({ event: TaskEvent.TaskAdded, listener: onTaskAdded });
    taskManagerService.addListener({ event: TaskEvent.TaskUpdated, listener: onTaskUpdated });
    taskManagerService.addListener({ event: TaskEvent.TaskRemoved, listener: onTaskRemoved });

    return () => {
      taskManagerService.removeListener({ event: TaskEvent.TaskAdded, listener: onTaskAdded });
      taskManagerService.removeListener({ event: TaskEvent.TaskUpdated, listener: onTaskUpdated });
      taskManagerService.removeListener({ event: TaskEvent.TaskRemoved, listener: onTaskRemoved });
    };
  }, []);

  return notifications;
}
