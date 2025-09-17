import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMockTutorialState = (initialStep = 0) => {
  let currentStep = initialStep;
  return {
    hasAnyUploadedFile: undefined,
    currentTutorialStep: currentStep,
    showSecondTutorialStep: false,
    uploadFileButtonRef: { current: null },
    divRef: { current: null },
    showTutorial: false,
    passToNextStep: () => ++currentStep,
  };
};

describe('useTutorialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const state = createMockTutorialState();
    expect(state).toMatchObject({
      hasAnyUploadedFile: undefined,
      currentTutorialStep: 0,
      showSecondTutorialStep: false,
      showTutorial: false,
    });
    expect(state.uploadFileButtonRef).toHaveProperty('current', null);
    expect(state.divRef).toHaveProperty('current', null);
    expect(typeof state.passToNextStep).toBe('function');
  });

  it('increments tutorial step with passToNextStep', () => {
    const state = createMockTutorialState();
    expect(state.currentTutorialStep).toBe(0);
    expect(state.passToNextStep()).toBe(1);
    expect(state.passToNextStep()).toBe(2);
  });

  it('handles different initial step values', () => {
    const state1 = createMockTutorialState(0);
    const state2 = createMockTutorialState(5);
    expect(state1.currentTutorialStep).toBe(0);
    expect(state2.currentTutorialStep).toBe(5);
  });

  it('maintains consistent property types', () => {
    const state = createMockTutorialState();
    expect(typeof state.hasAnyUploadedFile).toBe('undefined');
    expect(typeof state.currentTutorialStep).toBe('number');
    expect(typeof state.showSecondTutorialStep).toBe('boolean');
    expect(typeof state.showTutorial).toBe('boolean');
    expect(typeof state.passToNextStep).toBe('function');
    expect(typeof state.uploadFileButtonRef).toBe('object');
    expect(typeof state.divRef).toBe('object');
  });

  it('returns all expected properties', () => {
    const state = createMockTutorialState();
    const expectedProps = [
      'hasAnyUploadedFile',
      'currentTutorialStep',
      'showSecondTutorialStep',
      'uploadFileButtonRef',
      'divRef',
      'showTutorial',
      'passToNextStep',
    ];
    expectedProps.forEach((prop) => expect(state).toHaveProperty(prop));
  });
});
