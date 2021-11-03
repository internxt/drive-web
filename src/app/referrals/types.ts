export interface UserReferral {
  key: string;
  steps: number;
  completedSteps: number;
  credit: number;
  type: ReferralType;
}

export enum ReferralType {
  Storage = 'storage',
}
