import { UploadSimple } from '@phosphor-icons/react';
import { t } from 'i18next';
import { MutableRefObject } from 'react';
import { Button } from '@internxt/ui';
import { OnboardingModal } from './OnBoardingModal';
import { Step } from './Tutorial';

export const getSignUpSteps = (
  stepOneOptions: {
    onNextStepClicked: () => void;
    stepOneTutorialRef: MutableRefObject<Element | null>;
    offset?: { x: number; y: number };
  },
  stepTwoOptions: {
    onNextStepClicked: () => void;
  },
): Step[] =>
  [
    {
      content: (
        <div>
          <div onClick={stepOneOptions.onNextStepClicked} className="cursor-pointer">
            <Button variant="primary" className="ml-auto rounded-lg border-4 border-gray-1/75">
              <div className="flex items-center justify-center space-x-2.5">
                <div className="flex items-center space-x-0.5">
                  <UploadSimple weight="fill" size={24} />
                  <span className="font-medium">{t('actions.upload.uploadFiles')}</span>
                </div>
              </div>
            </Button>
            <div className="absolute right-0 top-0 mr-1 mt-1 h-10 w-40 animate-ping rounded-lg bg-primary" />
          </div>
          <div className="mt-2 rounded-lg bg-surface p-5 dark:bg-gray-5">
            <p className="text-lg text-gray-100">{t('tutorial.signUpTutorial.stepTwo.title')}.</p>
            <p className="mt-2 text-base text-gray-80">{t('tutorial.signUpTutorial.stepTwo.description')}</p>
          </div>
        </div>
      ),
      placement: 'bottom-end' as const,
      ref: stepOneOptions.stepOneTutorialRef,
      offset: { x: 0 + (stepOneOptions.offset?.x ?? 0), y: -40 + (stepOneOptions.offset?.x ?? 0) },
      disableClickNextStepOutOfContent: true,
    },
    {
      content: <OnboardingModal onCloseModalPressed={stepTwoOptions.onNextStepClicked} />,
      disableClickNextStepOutOfContent: true,
    },
  ] as Step[];
