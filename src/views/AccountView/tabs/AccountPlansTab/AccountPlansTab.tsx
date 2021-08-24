import { useState, useEffect } from 'react';
import { generateMnemonic } from 'bip39';
import { UilBuilding, UilHome } from '@iconscout/react-unicons';

import { IBillingPlan, IStripePlan, IStripeProduct } from '../../../../models/interfaces';
import { loadAvailablePlans, loadAvailableProducts, loadAvailableTeamsPlans, loadAvailableTeamsProducts, payStripePlan } from '../../../../services/products.service';
import notify, { ToastType } from '../../../../components/Notifications';
import analyticsService from '../../../../services/analytics.service';
import BillingPlanItem from './BillingPlanItem';
import { encryptPGP } from '../../../../lib/utilspgp';
import { getHeaders } from '../../../../lib/auth';
import { useAppDispatch } from '../../../../store/hooks';
import { fetchUserPlan } from '../../../../services/user.service';
import BillingCardSkeletton from '../../../../components/skinSkeleton/BillingCardSkeletton';
import { Workspace } from '../../../../models/enums';
import i18n from '../../../../services/i18n.service';
import envService from '../../../../services/env.service';
import { planActions } from '../../../../store/slices/plan';

import './AccountPlansTab.scss';

const Option = ({ text, currentOption, isBusiness, onClick }: { text: string, currentOption: Workspace, isBusiness: boolean, onClick: () => void }) => {
  const Body = () => {
    switch (true) {
      case isBusiness && currentOption === Workspace.Business:
        return (
          <div className='option border-b-2 border-blue-60' onClick={onClick}>
            <UilBuilding className='text-blue-60 active' />
            <span>{text}</span>
          </div>
        );

      case isBusiness && currentOption === Workspace.Personal:
        return (
          <div className='option' onClick={onClick}>
            <UilBuilding />
            <span>{text}</span>
          </div>
        );

      case !isBusiness && currentOption === Workspace.Personal:
        return (
          <div className='option border-b-2 border-blue-60' onClick={onClick}>
            <UilHome className='text-blue-60 active' />
            <span>{text}</span>
          </div>
        );

      case !isBusiness && currentOption === Workspace.Business:
        return (
          <div className='option' onClick={onClick}>
            <UilHome />
            <span>{text}</span>
          </div>
        );

      default: return null;
    }
  };

  return (
    <Body />
  );
};

const objectMap = (obj: Record<any, any>, fn): Record<any, any> => Object.fromEntries(Object.entries(obj).map(([key, value], i) => [key, fn(value, key, i)]));

const AccountPlansTab = ({ plansCharacteristics }: { plansCharacteristics: string[] }): JSX.Element => {
  const [currentOption, setCurrentOption] = useState<Workspace.Personal | Workspace.Business>(Workspace.Personal);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [products, setProducts] = useState<IBillingPlan>({});
  const [teamsProducts, setTeamsProducts] = useState<IBillingPlan>({});
  const dispatch = useAppDispatch();

  useEffect(() => {
    const getProducts = async () => {
      const userPlan = await fetchUserPlan();

      try {
        const products = await loadAvailableProducts();
        const teamsProducts = await loadAvailableTeamsProducts();

        if (userPlan) {
          dispatch(planActions.setUserPlan(userPlan));
        }
        dispatch(planActions.setIsLoadingStripePlan(false));

        const productsWithPlans = products.map(async product => ({
          product: product,
          plans: await loadAvailablePlans(product) || [],
          selected: '',
          currentPlan: userPlan?.planId || ''
        }));
        const teamsProductsWithPlans = teamsProducts.map(async product => ({
          product: product,
          plans: await loadAvailableTeamsPlans(product) || [],
          selected: '',
          currentPlan: userPlan?.planId || ''
        }));

        const finalProducts = await Promise.all(productsWithPlans);
        const keyedProducts: IBillingPlan = finalProducts.reduce((acc, prod) => ({ ...acc, [prod.product.id]: prod }), {});

        const finalTeamsProducts = await Promise.all(teamsProductsWithPlans);
        const keyedTeamsProducts: IBillingPlan = finalTeamsProducts.reduce((acc, prod) => ({ ...acc, [prod.product.id]: prod }), {});

        setProducts(keyedProducts);
        setTeamsProducts(keyedTeamsProducts);
      } catch (err) {
        //notify(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    getProducts();
  }, []);

  const handlePlanSelection = (planId: string, productId: string) => {
    const newProds = objectMap({ ...products }, (value: { plans: IStripePlan[], product: IStripeProduct, selected: boolean }) => {
      return {
        ...value,
        selected: productId === value.product.id ? planId : ''
      };
    });

    const newTeamsProds = objectMap({ ...teamsProducts }, (value: { plans: IStripePlan[], product: IStripeProduct, selected: boolean }) => {
      return {
        ...value,
        selected: productId === value.product.id ? planId : ''
      };
    });

    setProducts(newProds);
    setTeamsProducts(newTeamsProds);
  };

  const handlePaymentIndividual = async (selectedPlan: string, productId: string) => {
    setIsPaying(true);
    const stripe = window.Stripe(!envService.isProduction() ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK);
    const body: { plan: string, product: string, test?: boolean} = {
      plan: selectedPlan,
      product: productId
    };

    if (/^pk_test_/.exec(stripe._apiKey)) {
      body.test = true;
    }

    try {
      const session = await payStripePlan(body);

      analyticsService.trackUserEnterPayments();

      await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (err) {
      notify(i18n.get('error.redirectToStripe', {
        reason: err.message
      }), ToastType.Error);
    } finally {
      setIsPaying(false);
    }
  };

  const handlePaymentTeams = async (selectedPlanToBuy, productId: string, totalTeamMembers: number) => {
    const mnemonicTeam = generateMnemonic(256);
    const encMnemonicTeam = await encryptPGP(mnemonicTeam);
    const codMnemonicTeam = Buffer.from(encMnemonicTeam.data).toString('base64');
    const stripe = window.Stripe(!envService.isProduction() ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK);
    const body = {
      plan: selectedPlanToBuy,
      sessionType: 'team',
      quantity: totalTeamMembers,
      mnemonicTeam: codMnemonicTeam,
      test: !envService.isProduction()
    };

    fetch('/api/stripe/teams/session', {
      method: 'POST',
      headers: getHeaders(true, false),
      body: JSON.stringify(body)
    }).then(result => result.json()).then(result => {
      if (result.error) {
        throw Error(result.error);
      }

      stripe.redirectToCheckout({ sessionId: result.id }).catch(err => {});
    }).catch(err => {
      console.error('Error starting Stripe session. Reason: %s', err);
    });
  };

  return (
    <div className='w-full h-fit border border-m-neutral-60 rounded-xl'>
      <div className='flex justify-evenly items-center h-11'>
        <Option text='Individuals' currentOption={currentOption} isBusiness={false} onClick={() => {
          setCurrentOption(Workspace.Personal);
        }} />
        <div className='w-px h-1/2 border-r border-m-neutral-60' />
        <Option text='Business' currentOption={currentOption} isBusiness={true} onClick={() => {
          setCurrentOption(Workspace.Business);
        }} />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-t border-m-neutral-60 justify-evenly'>
        {!isLoading ?
          currentOption === Workspace.Personal ?
            Object.values(products).map((product, i) => (
              <BillingPlanItem
                key={i}
                product={product.product}
                plans={product.plans}
                selectedPlan={product.selected}
                currentPlan={product.currentPlan}
                buttontext='Subscribe'
                characteristics={['Web, Desktop & Mobile apps', 'Unlimited devices', 'Secure file sharing']}
                handlePlanSelection={handlePlanSelection}
                handlePaymentIndividual={handlePaymentIndividual}
                isPaying={isPaying}
                isBusiness={false}
                handlePaymentTeams={handlePaymentTeams}
              />)) :
            Object.values(teamsProducts).map((product, i) => (
              <BillingPlanItem
                key={i}
                product={product.product}
                plans={product.plans}
                selectedPlan={product.selected}
                currentPlan={product.currentPlan}
                buttontext='Subscribe'
                characteristics={['Web, Desktop & Mobile apps', 'Unlimited devices', 'Secure file sharing']}
                handlePlanSelection={handlePlanSelection}
                handlePaymentIndividual={handlePaymentIndividual}
                isPaying={isPaying}
                isBusiness={true}
                handlePaymentTeams={handlePaymentTeams}
              />)) :
          Array(3).fill(1).map((n, i) => (
            <div className="flex justify-center" key={i}>
              <BillingCardSkeletton />
            </div>))
        }
      </div>
    </div>
  );
};

export default AccountPlansTab;
