import { useEffect, useRef } from 'react';
import tasksService from '../app/tasks/services/tasks.service';
import { TaskStatus } from '../app/tasks/types';
import { t } from 'i18next';

const hasTasksInProcess = () => {
  const inProcessTasks = tasksService.getNotifications({ status: [TaskStatus.InProcess] });
  return inProcessTasks?.length > 0;
};

const useBeforeUnload = (shouldWarn: () => boolean = hasTasksInProcess) => {
  const shouldWarnRef = useRef(shouldWarn);
  shouldWarnRef.current = shouldWarn;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (shouldWarnRef.current()) {
        event.preventDefault();
        const message = t('general.reloadPageMessage');
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
};

export default useBeforeUnload;
