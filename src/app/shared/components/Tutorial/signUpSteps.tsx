import { t } from 'i18next';
import { UploadSimple } from 'phosphor-react';
import { MutableRefObject } from 'react';
import Button from '../Button/Button';
import { OnboardingModal } from './OnBoardingModal';
import { Step } from './Tutorial';

export const getSignUpSteps = (
  onNextStepClicked: () => void,
  stepTwoTutorialRef: MutableRefObject<Element | null>,
): Step[] =>
  [
    {
      content: <OnboardingModal />,
      disableClickNextStepOutOfContent: true,
    },
    {
      content: (
        <div>
          <div className="cursor-pointer">
            <Button variant="primary" className="ml-auto rounded-lg border-4 border-cool-gray-5 border-opacity-75">
              <div className="flex items-center justify-center space-x-2.5">
                <div className="flex items-center space-x-0.5">
                  <UploadSimple weight="fill" size={24} />
                  <span className="font-medium">{t('actions.upload.uploadFiles')}</span>
                </div>
              </div>
            </Button>
            <div className="absolute right-0 top-0 mt-1 mr-1 h-10 w-40 animate-ping rounded-lg bg-blue-50" />
          </div>
          <div className="mt-2 rounded-lg bg-white p-5">
            <p className="text-lg text-cool-gray-100">{t('tutorial.signUpTutorial.stepTwo.title')}.</p>
            <p className="mt-2 text-base text-cool-gray-80">{t('tutorial.signUpTutorial.stepTwo.description')}</p>
          </div>
        </div>
      ),
      placement: 'bottom-end' as const,
      ref: stepTwoTutorialRef,
      offset: { x: 0, y: -40 },
      disableClickNextStepOutOfContent: true,
      onNextStepClicked,
    },
  ] as Step[];
