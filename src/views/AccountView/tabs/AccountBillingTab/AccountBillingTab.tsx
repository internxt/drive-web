import React, { Fragment } from 'react';
import { useState } from 'react';
import './AccountBillingTab.scss';
import { useEffect } from 'react';
import { getIcon } from '../../../../services/icon.service';
import { IBillingPlan, IStripePlan, IStripeProduct } from '../../../../models/interfaces';
import { loadAvailablePlans, loadAvailableProducts, loadAvailableTeamsPlans, loadAvailableTeamsProducts, payStripePlan } from '../../../../services/products.service';
import notify from '../../../../components/Notifications';
import analyticsService from '../../../../services/analytics.service';
import SessionStorage from '../../../../lib/sessionStorage';
import BillingPlanItem from './BillingPlanItem';

const Option = ({ text, currentOption, isBusiness, onClick }: { text: string, currentOption: 'individual' | 'business', isBusiness: boolean, onClick: () => void }) => {
  const Body = () => {
    switch (true) {
      case isBusiness && currentOption === 'business':
        return (
          <div className='option border-b-2 border-blue-60' onClick={onClick}>
            <img src={getIcon('buildingBlue')} alt="house" className='active' />
            <span>{text}</span>
          </div>
        );

      case isBusiness && currentOption === 'individual':
        return (
          <div className='option' onClick={onClick}>
            <img src={getIcon('buildingGray')} alt="house" />
            <span>{text}</span>
          </div>
        );

      case !isBusiness && currentOption === 'individual':
        return (
          <div className='option border-b-2 border-blue-60' onClick={onClick}>
            <img src={getIcon('houseBlue')} alt="house" className='active' />
            <span>{text}</span>
          </div>
        );

      case !isBusiness && currentOption === 'business':
        return (
          <div className='option' onClick={onClick}>
            <img src={getIcon('houseGray')} alt="house" />
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

const AccountBillingTab = (): JSX.Element => {
  const [currentOption, setCurrentOption] = useState<'individual' | 'business'>('individual');
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [products, setProducts] = useState<IBillingPlan>({});
  const [teamsProducts, setTeamsProducts] = useState<IBillingPlan>({});

  useEffect(() => {
    const getProducts = async () => {
      try {
        //const customer = await loadAllStripeCustomers('');
        const products = await loadAvailableProducts();
        const teamsProducts = await loadAvailableTeamsProducts();

        const productsWithPlans = products.map(async product => ({
          product: product,
          plans: await loadAvailablePlans(product) || [],
          selected: ''
        }));
        const teamsProductsWithPlans = teamsProducts.map(async product => ({
          product: product,
          plans: await loadAvailableTeamsPlans(product) || []
        }));

        const finalProducts = await Promise.all(productsWithPlans);
        const keyedProducts: IBillingPlan = finalProducts.reduce((acc, prod) => ({ ...acc, [prod.product.id]: prod }), {});

        const finalTeamsProducts = await Promise.all(teamsProductsWithPlans);
        const keyedTeamsProducts: IBillingPlan = finalTeamsProducts.reduce((acc, prod) => ({ ...acc, [prod.product.id]: prod }), {});

        setProducts(keyedProducts);
        setTeamsProducts(keyedTeamsProducts);
      } catch (err) {
        notify(err.message, 'error');
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

  const handlePayment = async (selectedPlan: string, productId: string) => {
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

      <div className='flex h-88 border-t border-m-neutral-60'>
        {!isLoading ?
          currentOption === 'individual' ?
            Object.values(products).map((product, index) => (
              <Fragment key={product.product.id}>
                <BillingPlanItem
                  product={product.product}
                  plans={product.plans}
                  selectedPlan={product.selected}
                  buttontext='Subscribe'
                  characteristics={['Web, Desktop & Mobile apps', 'Unlimited devices', 'Secure file sharing']}
                  handlePlanSelection={handlePlanSelection}
                  handlePayment={handlePayment}
                  isPaying={isPaying}
                />
                {index < Object.keys(products).length - 1 && <div className='h-full border-r border-m-neutral-60' />}
              </Fragment>
            ))
            :
            Object.values(teamsProducts).map((product, index) => (
              <Fragment key={product.product.id}>
                <BillingPlanItem
                  product={product.product}
                  plans={product.plans}
                  selectedPlan={product.selected}
                  buttontext='Subscribe'
                  characteristics={['Web, Desktop & Mobile apps', 'Unlimited devices', 'Secure file sharing']}
                  handlePlanSelection={handlePlanSelection}
                  handlePayment={handlePayment}
                  isPaying={isPaying}
                />
                {index < Object.keys(teamsProducts).length - 1 && <div className='h-full border-r border-m-neutral-60' />}
              </Fragment>
            ))
          :
          <span>loading haha</span>
        }
      </div>
    </div>
  );
};

export default AccountBillingTab;
