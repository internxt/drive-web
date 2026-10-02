import { useState } from 'react';
import { useTaskManagerGetNotifications } from 'app/tasks/hooks';
import { TaskStatus, TaskType } from 'app/tasks/types';
import {
  calculateUsedPercentage,
  getReachedStorageWarningStage,
  isStageInCooldown,
  readDismissals,
  writeDismissal,
  StorageWarning,
  StorageWarningStage,
} from 'views/Home/utils/storageWarning';

const UPLOAD_IN_PROGRESS_STATUSES = [
  TaskStatus.Pending,
  TaskStatus.Encrypting,
  TaskStatus.InProcess,
  TaskStatus.Paused,
];

interface UseStorageWarningBannerParams {
  planLimit: number;
  planUsage: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
  isFreeUser: boolean;
}

interface StorageWarningBanner {
  reachedStage: StorageWarningStage;
  usedPercentage: number;
  onCloseButtonClick: () => void;
}

export const useStorageWarningBanner = ({
  planLimit,
  planUsage,
  isLoadingPlanLimit,
  isLoadingPlanUsage,
  isFreeUser,
}: UseStorageWarningBannerParams): StorageWarningBanner | null => {
  const [sessionDismissedStage, setSessionDismissedStage] = useState<StorageWarning | null>(null);

  const uploadNotifications = useTaskManagerGetNotifications({ status: UPLOAD_IN_PROGRESS_STATUSES });
  const isUploading = uploadNotifications.some(
    (notification) => notification.action === TaskType.UploadFile || notification.action === TaskType.UploadFolder,
  );

  const isLoading = isLoadingPlanLimit || isLoadingPlanUsage;
  const plansNotFetched = planUsage === 0 && planLimit === 0;
  const areNotValidNumbers =
    !Number.isFinite(planUsage) || !Number.isFinite(planLimit) || planLimit <= 0 || planUsage < 0;

  if (!isFreeUser || isLoading || plansNotFetched || areNotValidNumbers || isUploading) return null;

  const usedPercentage = calculateUsedPercentage(planUsage, planLimit);

  const reachedStage = getReachedStorageWarningStage(usedPercentage);
  if (!reachedStage) return null;

  const isHiddenThisSession = sessionDismissedStage === reachedStage.key;
  if (isHiddenThisSession || isStageInCooldown(reachedStage, readDismissals(), Date.now())) return null;

  const onCloseButtonClick = () => {
    writeDismissal(reachedStage.key, Date.now());
    setSessionDismissedStage(reachedStage.key);
  };

  return { reachedStage, usedPercentage, onCloseButtonClick };
};
