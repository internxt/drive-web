import { useState, useEffect } from 'react';

import taskManagerService from '../services/task-manager.service';
import { TaskManagerEvent } from '../services/task-manager.service/enums';
import { TaskFilter } from '../services/task-manager.service/interfaces';

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
