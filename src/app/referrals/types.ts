export interface UserReferral {
  key: string;
  steps: number;
  completedSteps: number;
  isCompleted: boolean;
  credit: number;
  type: ReferralType;
}

export enum ReferralType {
  Storage = 'storage',
}
