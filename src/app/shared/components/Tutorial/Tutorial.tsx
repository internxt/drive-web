import React, { CSSProperties, FC, useRef } from 'react';
import { Placement } from '@popperjs/core';
import { usePopper } from 'react-popper';

interface TutorialProps {
  show?: boolean;
  steps: Step[];
  currentStep: number;
  passToNextStep?: () => void;
  children: React.ReactNode;
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
};

const centeredStyle: CSSProperties = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

export const Tutorial: FC<TutorialProps> = ({ show, steps, children, currentStep, passToNextStep }) => {
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

  const handleNextStep = () => {
    if (!disableClickNextStepOutOfContent) passToNextStep?.();
  };

  if (isTutorialFinished || !show) {
    return <div className="flex h-full grow">{children}</div>;
  }

  return (
    <div className="flex h-full grow" onClick={handleNextStep} onKeyDown={() => {}}>
      <div className="fixed inset-0 z-10 flex bg-black/40" />
      {children}
      <div ref={popperRef} className="z-50" style={existsRef ? styles.popper : centeredStyle} {...attributes.popper}>
        <div>{content}</div>
      </div>
    </div>
  );
};
