export enum AnalyticsTrackNames {
  SignOut = 'User SignOut',
  SignIn = 'user-signin',
  SignInAttempted = 'user-signin-attempted',
  SignUp = 'User Signup',
  UserEnterPayments = 'Checkout Opened',
  PlanSubscriptionSelected = 'plan-subscription-selected',
  FolderCreated = 'folder-created',
  FolderRename = 'folder-rename',
  FileRename = 'file-rename',

  OpenWelcomeFile = 'file-welcome-open',
  DeleteWelcomeFile = 'file-welcome-delete',
  FileShare = 'file-share',
  UserResetPasswordRequest = 'user-reset-password-request',
  FileUploadBucketIdUndefined = 'file-upload-bucketid-undefined',
  ShareLinkBucketIdUndefined = 'share-link-bucketid-undefined',
  PaymentConversionEvent = 'Payment Conversion',
  CancelPaymentConversionEvent = 'Cancel Payment Conversion',
}

export interface PriceMetadata {
  maxSpaceBytes: string;
  name: string;
  planType: string;
  show?: string;
}

export interface RecurringPrice {
  aggregate_usage?: unknown;
  interval: 'month' | 'year';
  interval_count: number;
  trial_period_days: number;
  usage_type: string;
}

export interface PriceData {
  active: boolean;
  billing_schema: string;
  created: number;
  currency: string;
  id: string;
  livemode: boolean;
  lookup_key?: string;
  metadata: PriceMetadata;
  nickname: string;
  object: string;
  product: string;
  recurring?: RecurringPrice;
  tax_behaviour: string;
  transform_quantity: unknown;
  type: 'recurring' | 'one_time';
  unit_amount: number;
  unit_amount_decimal: string;
}
