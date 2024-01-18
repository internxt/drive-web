import { useEffect } from 'react';
import tasksService from '../app/tasks/services/tasks.service';
import { TaskStatus } from '../app/tasks/types';
import { t } from 'i18next';

const useBeforeUnload = () => {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const inProcessTasks = tasksService.getNotifications({ status: [TaskStatus.InProcess] });
      const areTaskRunning = inProcessTasks?.length > 0;

      if (areTaskRunning) {
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
