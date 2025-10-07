import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { userSelectors } from '../../../../store/slices/user';
import { useTaskManagerGetNotifications } from '../../../../tasks/hooks';
import { TaskStatus } from '../../../../tasks/types';
import newStorageService from '../../../services/new-storage.service';
import errorService from '../../../../core/services/error.service';
import envService from '../../../../core/services/env.service';

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
