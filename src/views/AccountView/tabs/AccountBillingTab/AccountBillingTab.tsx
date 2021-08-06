import { useState, useEffect, Fragment } from 'react';
import { IBillingPlan, IStripePlan, IStripeProduct } from '../../../../models/interfaces';
import { loadAvailablePlans, loadAvailableProducts, loadAvailableTeamsPlans, loadAvailableTeamsProducts, payStripePlan } from '../../../../services/products.service';
import notify from '../../../../components/Notifications';
import analyticsService from '../../../../services/analytics.service';
import SessionStorage from '../../../../lib/sessionStorage';
import BillingPlanItem from './BillingPlanItem';
import { generateMnemonic } from 'bip39';
import { encryptPGP } from '../../../../lib/utilspgp';
import { getHeaders } from '../../../../lib/auth';
import './AccountBillingTab.scss';
import { useAppDispatch } from '../../../../store/hooks';
import { setUserPlan, userActions } from '../../../../store/slices/user';
import { fetchUserPlan } from '../../../../services/user.service';
import { UilBuilding, UilHome } from '@iconscout/react-unicons';
import BillingCardSkeletton from '../../../../components/skinSkeleton/BillingCardSkeletton';

const Option = ({ text, currentOption, isBusiness, onClick }: { text: string, currentOption: 'individual' | 'business', isBusiness: boolean, onClick: () => void }) => {
  const Body = () => {
    switch (true) {
      case isBusiness && currentOption === 'business':
        return (
          <div className='option border-b-2 border-blue-60' onClick={onClick}>
            <UilBuilding className='text-blue-60 active' />
            <span>{text}</span>
          </div>
        );

      case isBusiness && currentOption === 'individual':
        return (
          <div className='option' onClick={onClick}>
            <UilBuilding />
            <span>{text}</span>
          </div>
        );

      case !isBusiness && currentOption === 'individual':
        return (
          <div className='option border-b-2 border-blue-60' onClick={onClick}>
            <UilHome className='text-blue-60 active' />
            <span>{text}</span>
          </div>
        );

      case !isBusiness && currentOption === 'business':
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

const AccountBillingTab = ({ plansCharacteristics }: { plansCharacteristics: string[] }): JSX.Element => {
  const [currentOption, setCurrentOption] = useState<'individual' | 'business'>('individual');
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
          dispatch(setUserPlan(userPlan));
        }
        dispatch(userActions.setIsLoadingStripePlan(false));

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
    const stripe = window.Stripe(process.env.NODE_ENV !== 'production' ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK);

    const body: { plan: string, product: string, test?: boolean } = {
      plan: selectedPlan,
      product: productId
    };

    if (/^pk_test_/.exec(stripe._apiKey)) {
      body.test = true;
    }

    try {
      const session = await payStripePlan(body);

      analyticsService.trackUserEnterPayments();
      SessionStorage.del('limitStorage');

      await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (err) {
      notify('Failed to redirect to Stripe. Please contact us. Reason: ' + err.message, 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const handlePaymentTeams = async (selectedPlanToBuy, totalTeamMembers) => {
    const mnemonicTeam = generateMnemonic(256);
    const encMnemonicTeam = await encryptPGP(mnemonicTeam);

    const codMnemonicTeam = Buffer.from(encMnemonicTeam.data).toString('base64');
    const stripe = window.Stripe(process.env.NODE_ENV !== 'production' ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK);
    const body = {
      plan: selectedPlanToBuy,
      sessionType: 'team',
      quantity: totalTeamMembers,
      mnemonicTeam: codMnemonicTeam,
      test: process.env.NODE_ENV !== 'production'
    };

    fetch('/api/stripe/teams/session', {
      method: 'POST',
      headers: getHeaders(true, false),
      body: JSON.stringify(body)
    }).then(result => result.json()).then(result => {
      if (result.error) {
        throw Error(result.error);
      }

      stripe.redirectToCheckout({ sessionId: result.id }).catch(err => {
      });
    }).catch(err => {
      console.error('Error starting Stripe session. Reason: %s', err);
    });
  };

  return (
    <div className='flex flex-col w-full border border-m-neutral-60 rounded-xl mt-10'>
      <div className='flex justify-evenly items-center h-11'>
        <Option text='Individuals' currentOption={currentOption} isBusiness={false} onClick={() => {
          setCurrentOption('individual');
        }} />
        <div className='w-px h-1/2 border-r border-m-neutral-60' />
        <Option text='Business' currentOption={currentOption} isBusiness={true} onClick={() => {
          setCurrentOption('business');
        }} />
      </div>

      <div className='flex h-88 border-t border-m-neutral-60 justify-evenly'>
        {!isLoading ?
          currentOption === 'individual' ?
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
                isBusiness={false}
                handlePaymentTeams={handlePaymentTeams}
              />)) :
          Array(3).fill(1).map((n, i) => <BillingCardSkeletton key={i} />)
        }
      </div>
    </div>
  );
};

export default AccountBillingTab;
