export interface AppSumoDetails {
  createdAt: string;
  id: number;
  invoiceItemUuid: string;
  planId: AppSumoTier;
  updatedAt: '';
  uuid: string;
}

export enum AppSumoTier {
  Free = 'internxt_free1',
  Tier1 = 'internxt_tier1',
  Tier2 = 'internxt_tier2',
  Tier3 = 'internxt_tier3',
  Tier4 = 'internxt_tier4',
  Tier5 = 'internxt_tier5',
}
