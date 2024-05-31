import { StripePaymentElementOptions } from '@stripe/stripe-js';

export type AuthMethodTypes = 'signUp' | 'signIn' | 'userIsSignedIn';

export interface ClientSecretObj {
  clientSecretType: 'payment' | 'setup';
  client_secret: string;
}

export interface PasswordStateProps {
  tag: 'error' | 'warning' | 'success';
  label: string;
}

export const PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  layout: {
    type: 'accordion',
    defaultCollapsed: false,
    radios: false,
    spacedAccordionItems: true,
  },
};
