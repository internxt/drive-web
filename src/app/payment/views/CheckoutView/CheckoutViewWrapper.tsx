import { Elements } from '@stripe/react-stripe-js';
import { useEffect, useCallback, useReducer } from 'react';
import { useThemeContext } from 'app/theme/ThemeProvider';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import errorService from 'app/core/services/error.service';
import CheckoutView from './CheckoutView';
import { initialState, checkoutReducer } from './checkoutReducer';
import { fetchPlanById, fetchPromotionCodeById } from 'app/payment/helpers/checkout';
import envService from 'app/core/services/env.service';
import { StripeElementsOptions, loadStripe } from '@stripe/stripe-js';

export const stripePromise = (async () => {
  const stripeKey = envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK;
  return await loadStripe(stripeKey);
})();

const CheckoutViewWrapper = () => {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);
  const { currentTheme } = useThemeContext();

  const handleFetchSelectedPlan = useCallback(async (planId: string) => {
    dispatch({ type: 'SET_IS_LOADING', payload: true });

    try {
      const plan = await fetchPlanById(planId);
      dispatch({ type: 'SET_SELECTED_PLAN', payload: plan });
      return plan;
    } catch (error) {
      console.error('Error fetching plan or payment intent:', error);
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false });
    }
  }, []);

  const handleFetchPromotionCode = useCallback(async (promotionCode: string) => {
    const promoCodeData = await fetchPromotionCodeById(promotionCode);

    return promoCodeData;
  }, []);

  useEffect(() => {
    const stripeElementsBackgroundColor = currentTheme === 'dark' ? 'rgb(17 17 17)' : 'rgb(255 255 255)';
    const stripeElementsTextColor = currentTheme === 'dark' ? 'rgb(255 255 255)' : 'rgb(17 17 17)';

    const elementsOptions: StripeElementsOptions = {
      appearance: {
        labels: 'above',
        variables: {
          spacingAccordionItem: '8px',
          colorPrimary: stripeElementsTextColor,
        },
        theme: 'flat',
        rules: {
          '.AccordionItem:hover': {
            color: stripeElementsTextColor,
          },
          '.TermsText': {
            color: stripeElementsTextColor,
          },
          '.AccordionItem': {
            border: `1px solid ${stripeElementsBackgroundColor}`,
            backgroundColor: stripeElementsBackgroundColor,
          },
          '.Label': {
            color: stripeElementsTextColor,
          },
          '.RedirectText': {
            color: stripeElementsTextColor,
          },
        },
      },
    };

    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');
    const promotionCode = params.get('promotion_code');

    if (planId) {
      handleFetchSelectedPlan(planId)
        .then(async (plan) => {
          dispatch({
            type: 'SET_ELEMENTS_OPTIONS',
            payload: {
              ...(elementsOptions as any),
              mode: plan?.interval === 'lifetime' ? 'payment' : 'subscription',
              amount: plan?.amount,
              currency: plan?.currency,
            },
          });

          const stripe = await stripePromise;
          dispatch({ type: 'SET_STRIPE', payload: stripe });
        })
        .catch((err) => {
          const error = err as Error;
          errorService.reportError(error);
          navigationService.push(AppView.Drive);
        });

      if (promotionCode) {
        handleFetchPromotionCode(promotionCode)
          .then((promoCodeData) => {
            dispatch({ type: 'SET_COUPON_CODE_DATA', payload: promoCodeData });
          })
          .catch((err) => {
            const error = err as Error;

            errorService.reportError(error);
            // navigationService.push(AppView.Drive);
          });
      }
    } else {
      navigationService.push(AppView.Drive);
    }
  }, [currentTheme, handleFetchSelectedPlan, handleFetchPromotionCode]);

  useEffect(() => {
    if (state.promoCode) {
      handleFetchPromotionCode(state.promoCode as string).then((promoCode) => {
        dispatch({ type: 'SET_COUPON_CODE_DATA', payload: promoCode });
      });
    }
  }, [state.promoCode]);

  const handleOnInputChange = (coupon: string) => dispatch({ type: 'SET_PROMO_CODE', payload: coupon });

  return state.isLoading ? (
    <></>
  ) : (
    <Elements stripe={state.stripe} options={state.elementsOptions}>
      <CheckoutView
        isLoading={state.isLoading}
        selectedPlan={state.selectedPlan}
        couponCodeData={state.couponCodeData}
        handleOnInputChange={handleOnInputChange}
      />
    </Elements>
  );
};

export default CheckoutViewWrapper;
