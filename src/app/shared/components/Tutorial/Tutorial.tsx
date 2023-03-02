import React, { CSSProperties, FC, useRef, useState } from 'react';
import { Placement } from '@popperjs/core';
import { usePopper } from 'react-popper';

interface TutorialProps {
  show?: boolean;
  steps: Step[];
}

export type Step = {
  content: React.ReactNode;
  placement?: Placement;
  ref?: React.MutableRefObject<Element>;
  offset?: {
    x: number;
    y: number;
  };
  disableClickNextStepOutOfContent?: boolean;
  onNextStepClicked?: () => void;
};

const centeredStyle: CSSProperties = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

export const Tutorial: FC<TutorialProps> = ({ show, steps, children }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const popperRef = useRef(null);

  const existsRef = !!steps[currentStep]?.ref;
  const isTutorialFinished = currentStep === steps.length;

  const step = !isTutorialFinished ? steps[currentStep] : { content: undefined };
  const {
    ref = undefined,
    offset = undefined,
    content = undefined,
    placement = undefined,
    disableClickNextStepOutOfContent = undefined,
    onNextStepClicked = undefined,
  }: Step = step;

  const { styles, attributes } = usePopper(ref?.current, popperRef.current, {
    placement: placement,
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: offset ? [offset.x, offset.y] : [0, 10],
        },
      },
    ],
  });

  const passToNextStep = () => setCurrentStep(currentStep + 1);

  const handleNextStep = () => {
    if (!disableClickNextStepOutOfContent) passToNextStep();
  };

  const handleOnNextStepClicked = () => {
    onNextStepClicked?.();
    passToNextStep();
  };

  if (isTutorialFinished || !show) {
    return <div className="flex h-full flex-grow">{children}</div>;
  }

  return (
    <div className="flex h-full flex-grow" onClick={handleNextStep}>
      <div className="fixed inset-0 z-10 flex bg-black opacity-40" />
      {children}
      <div ref={popperRef} className="z-50" style={existsRef ? styles.popper : centeredStyle} {...attributes.popper}>
        <div onClick={handleOnNextStepClicked}>{content}</div>
      </div>
    </div>
  );
};
