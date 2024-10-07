import { StripeElementsOptions } from '@stripe/stripe-js';
import { PlanData } from '../types';
import envService from 'app/core/services/env.service';

const IS_PRODUCTION = envService.isProduction();
const BORDER_SHADOW = 'rgb(0 102 255)';

export const loadStripeElements = async (
  theme: {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    borderInputColor: string;
    labelTextColor: string;
  },
  onLoadElements: (stripeElementsOptions: StripeElementsOptions) => void,
  plan: PlanData,
) => {
  const { backgroundColor, textColor, borderColor, borderInputColor, labelTextColor } = theme;

  const stripeElementsOptions: StripeElementsOptions = {
    appearance: {
      labels: 'above',
      variables: {
        spacingAccordionItem: '8px',
        colorPrimary: textColor,
      },
      theme: 'flat',
      rules: {
        '.AccordionItem:hover': {
          color: textColor,
        },
        '.Block': {
          backgroundColor: backgroundColor,
        },
        '.TermsText': {
          color: textColor,
        },
        '.AccordionItem': {
          borderRadius: '16px',
          borderColor: borderColor,
          border: '1px solid',
          backgroundColor: backgroundColor,
        },
        '.Input': {
          backgroundColor: `${backgroundColor}`,
          borderRadius: '0.375rem',
          color: textColor,
          border: `1px solid ${borderInputColor}`,
        },
        '.Input:focus': {
          backgroundColor: `${backgroundColor}`,
          // borderColor: borderInputColor,
          boxShadow: `0px 0px 4px ${BORDER_SHADOW}`,
          border: `0.5px solid ${BORDER_SHADOW}`,
        },
        '.Input::selection': {
          backgroundColor: `${backgroundColor}`,
          // borderColor: borderInputColor,
          border: `0.5px solid ${BORDER_SHADOW}`,
        },
        '.Label': {
          color: labelTextColor,
          fontSize: '0.875rem',
        },
        '.RedirectText': {
          color: textColor,
        },
      },
    },
    mode: plan?.selectedPlan.interval === 'lifetime' ? 'payment' : 'subscription',
    amount: plan?.selectedPlan.amount,
    currency: plan?.selectedPlan.currency,
    payment_method_types: ['card', 'paypal', 'sepa_debit'],
  };

  onLoadElements(stripeElementsOptions);
};
