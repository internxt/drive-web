import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from 'app/store/hooks';
import { userSelectors } from 'app/store/slices/user';
import { useTaskManagerGetNotifications } from 'app/tasks/hooks';
import { TaskStatus } from 'app/tasks/types';
import newStorageService from 'app/drive/services/new-storage.service';
import errorService from 'app/core/services/error.service';
import envService from 'app/core/services/env.service';

export const useTutorialState = () => {
  const [hasAnyUploadedFile, setHasAnyUploadedFile] = useState<boolean | undefined>();
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const [showSecondTutorialStep, setShowSecondTutorialStep] = useState(false);
  const uploadFileButtonRef = useRef(null);
  const divRef = useRef<HTMLDivElement | null>(null);

  const hasSignedToday = useAppSelector(userSelectors.hasSignedToday);
  const successNotifications = useTaskManagerGetNotifications({
    status: [TaskStatus.Success],
  });

  const showTutorial =
    hasAnyUploadedFile !== undefined &&
    !hasAnyUploadedFile &&
    envService.isProduction() &&
    hasSignedToday &&
    (showSecondTutorialStep || currentTutorialStep === 0);

  useEffect(() => {
    if (!hasAnyUploadedFile && currentTutorialStep === 1 && successNotifications[0]?.status === TaskStatus.Success) {
      setShowSecondTutorialStep(true);
    }
  }, [currentTutorialStep, successNotifications, hasAnyUploadedFile]);

  useEffect(() => {
    if (hasSignedToday) {
      newStorageService
        .hasUploadedFiles()
        .then(({ hasUploadedFiles }) => {
          setHasAnyUploadedFile(hasUploadedFiles);
        })
        .catch((error) => {
          errorService.reportError(error);
        });
    }
  }, [hasSignedToday]);

  const passToNextStep = () => {
    setCurrentTutorialStep(currentTutorialStep + 1);
  };

  return {
    hasAnyUploadedFile,
    currentTutorialStep,
    showSecondTutorialStep,
    uploadFileButtonRef,
    divRef,
    showTutorial,
    passToNextStep,
  };
};
