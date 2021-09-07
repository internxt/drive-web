import { useState, Fragment } from 'react';
import { generateMnemonic } from 'bip39';
import { UilBuilding, UilHome } from '@iconscout/react-unicons';

import analyticsService from '../../../../services/analytics.service';
import ProductItem from './ProductItem';
import { encryptPGP } from '../../../../lib/utilspgp';
import { getHeaders } from '../../../../lib/auth';
import BillingCardSkeletton from '../../../../components/loaders/BillingCardSkeletton';
import { Workspace } from '../../../../models/enums';
import i18n from '../../../../services/i18n.service';
import envService from '../../../../services/env.service';
import { payStripePlan } from '../../../../services/products.service';
import { useAppSelector } from '../../../../store/hooks';
import notificationsService, { ToastType } from '../../../../services/notifications.service';

import configService from '../../../../services/config.service';

import './AccountPlansTab.scss';
import errorService from '../../../../services/error.service';

const AccountPlansTab = (): JSX.Element => {
  const [currentOption, setCurrentOption] = useState<Workspace.Personal | Workspace.Business>(Workspace.Personal);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);
  const individualPlan = useAppSelector((state) => state.plan.individualPlan);
  const teamPlan = useAppSelector((state) => state.plan.teamPlan);
  const isLoadingIndividualProducts = useAppSelector((state) => state.products.isLoadingIndividualProducts);
  const individualProducts = useAppSelector((state) => state.products.individualProducts);
  const individualProductsPlans = useAppSelector((state) => state.products.individualProductsPlans);
  const isLoadingTeamProducts = useAppSelector((state) => state.products.isLoadingTeamProducts);
  const teamProducts = useAppSelector((state) => state.products.teamProducts);
  const teamProductsPlans = useAppSelector((state) => state.products.teamProductsPlans);
  const tabOptions: { id: string; label: string; icon: JSX.Element; onClick: () => void }[] = [
    {
      id: Workspace.Personal,
      label: 'Individual',
      icon: <UilHome />,
      onClick: () => setCurrentOption(Workspace.Personal),
    },
    {
      id: Workspace.Business,
      label: 'Business',
      icon: <UilBuilding />,
      onClick: () => setCurrentOption(Workspace.Business),
    },
  ];
  const loadingSkeleton = Array(3)
    .fill(1)
    .map((n, i) => (
      <div className="flex justify-center" key={i}>
        <BillingCardSkeletton />
      </div>
    ));
  const handlePaymentIndividual = async (selectedPlan: string, productId: string) => {
    setIsPaying(true);
    const stripe = window.Stripe(
      !envService.isProduction() ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK,
    );
    const body: { plan: string; product: string; test?: boolean } = {
      plan: selectedPlan,
      product: productId,
    };

    if (/^pk_test_/.exec(stripe._apiKey)) {
      body.test = true;
    }

    try {
      const session = await payStripePlan(body);

      analyticsService.trackUserEnterPayments();

      await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(
        i18n.get('error.redirectToStripe', {
          reason: castedError.message,
        }),
        ToastType.Error,
      );
    } finally {
      setIsPaying(false);
    }
  };
  const handlePaymentTeams = async (selectedPlanToBuy: string, productId: string, totalTeamMembers: number) => {
    const mnemonicTeam = generateMnemonic(256);
    const encMnemonicTeam = await encryptPGP(mnemonicTeam);
    const codMnemonicTeam = Buffer.from(encMnemonicTeam.data).toString('base64');
    const stripe = window.Stripe(
      !envService.isProduction() ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK,
    );
    const body = {
      plan: selectedPlanToBuy,
      sessionType: 'team',
      quantity: totalTeamMembers,
      mnemonicTeam: codMnemonicTeam,
      test: !envService.isProduction(),
    };

    fetch(`${process.env.REACT_APP_API_URL}/api/stripe/teams/session`, {
      method: 'POST',
      headers: getHeaders(true, false),
      body: JSON.stringify(body),
    })
      .then((result) => result.json())
      .then((result) => {
        if (result.error) {
          throw Error(result.error);
        }

        stripe.redirectToCheckout({ sessionId: result.id });
      })
      .catch((err) => {
        console.error('Error starting Stripe session. Reason: %s', err);
      });
  };
  const onPlanSelected = (productId: string, planId: string) => {
    setSelectedPlanId(planId);
  };

  return (
    <div className="w-full h-fit border border-m-neutral-60 rounded-xl">
      <div className="flex justify-evenly items-center h-11">
        {tabOptions.map((option, index) => {
          const tabOptionSelectedClassName = 'border-b-2 border-blue-60';
          const tabOptionIconSelectedClassName = 'text-blue-60 active';
          const isSelected = option.id === currentOption;

          return (
            <Fragment key={index}>
              <div className={`option ${isSelected ? tabOptionSelectedClassName : ''}`} onClick={option.onClick}>
                <div className={isSelected ? tabOptionIconSelectedClassName : ''}>{option.icon}</div>
                <span>{option.label}</span>
              </div>

              {index < tabOptions.length - 1 && <div className="w-px h-1/2 border-r border-m-neutral-60" />}
            </Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-t border-m-neutral-60 justify-evenly">
        {currentOption === Workspace.Personal &&
          (isLoadingIndividualProducts
            ? loadingSkeleton
            : individualProducts.map((product, i) => (
                <ProductItem
                  key={i}
                  product={product}
                  plans={individualProductsPlans[i]}
                  selectedPlanId={selectedPlanId}
                  currentPlanId={individualPlan?.planId}
                  characteristics={configService.getAppConfig().plan.defaultFeatures}
                  handlePlanSelection={onPlanSelected}
                  handlePaymentIndividual={handlePaymentIndividual}
                  isPaying={isPaying}
                  isBusiness={false}
                  handlePaymentTeams={handlePaymentTeams}
                />
              )))}

        {currentOption === Workspace.Business &&
          (isLoadingTeamProducts
            ? loadingSkeleton
            : teamProducts.map((product, i) => (
                <ProductItem
                  key={i}
                  product={product}
                  plans={teamProductsPlans[i]}
                  selectedPlanId={selectedPlanId}
                  currentPlanId={teamPlan?.planId}
                  characteristics={configService.getAppConfig().plan.defaultFeatures}
                  handlePlanSelection={onPlanSelected}
                  handlePaymentIndividual={handlePaymentIndividual}
                  isPaying={isPaying}
                  isBusiness={true}
                  handlePaymentTeams={handlePaymentTeams}
                />
              )))}
      </div>
    </div>
  );
};

export default AccountPlansTab;
