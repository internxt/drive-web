import { useState, useEffect } from 'react';

import taskManagerService from '../services/tasks.service';
import { TaskManagerEvent, TaskFilter } from '../types';

export function useTaskManagerGetNotifications(filter: TaskFilter = {}) {
  const [notifications, setNotifications] = useState(taskManagerService.getNotifications(filter));
  const onTaskAdded = () => {
    setNotifications(taskManagerService.getNotifications(filter));
  };
  const onTaskUpdated = () => {
    setNotifications(taskManagerService.getNotifications(filter));
  };

  useEffect(() => {
    taskManagerService.addListener(TaskManagerEvent.TaskAdded, onTaskAdded);
    taskManagerService.addListener(TaskManagerEvent.TaskUpdated, onTaskUpdated);

    return () => {
      taskManagerService.removeListener(TaskManagerEvent.TaskAdded, onTaskAdded);
      taskManagerService.removeListener(TaskManagerEvent.TaskUpdated, onTaskUpdated);
    };
  }, []);

  return notifications;
}
