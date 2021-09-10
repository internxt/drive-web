import { useState } from 'react';
import { generateMnemonic } from 'bip39';
import * as Unicons from '@iconscout/react-unicons';

import analyticsService from '../../../../services/analytics.service';
import ProductItem from './ProductItem';
import { encryptPGP } from '../../../../lib/utilspgp';
import { getHeaders } from '../../../../lib/auth';
import { RenewalPeriod, Workspace } from '../../../../models/enums';
import i18n from '../../../../services/i18n.service';
import envService from '../../../../services/env.service';
import { payStripePlan } from '../../../../services/products.service';
import { useAppSelector } from '../../../../store/hooks';
import notificationsService, { ToastType } from '../../../../services/notifications.service';

import './AccountPlansTab.scss';
import errorService from '../../../../services/error.service';

const AccountPlansTab = (): JSX.Element => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(Workspace.Individuals);
  const [currentRenewalPeriod, setCurrentRenewalPeriod] = useState<RenewalPeriod>(RenewalPeriod.Semiannually);
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
  const onRenewalPeriodItemClicked = (key: RenewalPeriod) => {
    setCurrentRenewalPeriod(key);
  };
  const renewalPeriodList = Object.values(RenewalPeriod).map((key) => (
    <div
      onClick={() => onRenewalPeriodItemClicked(key)}
      key={key}
      className={`${key === currentRenewalPeriod ? 'active' : ''} account-plans-renewal-period-item`}
    >
      {i18n.get(`general.renewalPeriod.${key}`)}
    </div>
  ));
  const changePlansWorkspaceLabel = i18n.get(`views.account.tabs.plans.changeWorkspace.${currentWorkspace}`);
  const onChangePlansWorkspaceClicked = () => {
    const workspaceKeys = Object.values(Workspace);
    const currentWorkspaceIndex = workspaceKeys.findIndex((key) => key === currentWorkspace);
    const nextWorkspace = workspaceKeys[(currentWorkspaceIndex + 1) % workspaceKeys.length];

    setCurrentWorkspace(nextWorkspace);
  };
  const features = [
    {
      icon: Unicons.UilShieldPlus,
      title: i18n.get('views.account.tabs.plans.features.0.title'),
      description: i18n.get('views.account.tabs.plans.features.0.description'),
    },
    {
      icon: Unicons.UilShieldPlus,
      title: i18n.get('views.account.tabs.plans.features.1.title'),
      description: i18n.get('views.account.tabs.plans.features.1.description'),
    },
    {
      icon: Unicons.UilShieldPlus,
      title: i18n.get('views.account.tabs.plans.features.2.title'),
      description: i18n.get('views.account.tabs.plans.features.2.description'),
    },
  ];
  const featuresList = features.map((feature, index) => (
    <div
      key={index}
      className="square flex flex-col justify-center items-center border border-l-neutral-30 rounded-lg text-center p-3"
    >
      <feature.icon className="text-blue-40 mb-2" />
      <span className="block text-neutral-900 mb-2">{feature.title}</span>
      <span className="block text-m-neutral-100 text-sm">{feature.description}</span>
    </div>
  ));

  return (
    <div className="group w-full h-fit">
      {/* PERIOD SELECTOR */}
      <div className="mx-auto mb-6 rounded-lg bg-l-neutral-20 h-10 w-96 flex py-1 px-0.5">{renewalPeriodList}</div>

      {/* CHANGE PLANS WORKSPACE */}
      <span
        className="block mx-auto w-max text-center text-blue-60 font-semibold mb-6 cursor-pointer"
        onClick={onChangePlansWorkspaceClicked}
      >
        {changePlansWorkspaceLabel}
      </span>

      {isLoadingIndividualProducts || isLoadingTeamProducts ? (
        <span className="block w-full text-center">{i18n.get('general.loading')}</span>
      ) : (
        <div className="gap-4 grid grid-cols-1 lg:grid-cols-3 justify-center">
          {currentWorkspace === Workspace.Individuals &&
            individualProducts.map((product, i) => (
              <ProductItem
                key={i}
                product={product}
                plans={individualProductsPlans[i]}
                selectedPlanId={selectedPlanId}
                currentPlanId={individualPlan?.planId}
                handlePlanSelection={onPlanSelected}
                handlePaymentIndividual={handlePaymentIndividual}
                isPaying={isPaying}
                isBusiness={false}
                handlePaymentTeams={handlePaymentTeams}
              />
            ))}

          {currentWorkspace === Workspace.Business &&
            teamProducts.map((product, i) => (
              <ProductItem
                key={i}
                product={product}
                plans={teamProductsPlans[i]}
                selectedPlanId={selectedPlanId}
                currentPlanId={teamPlan?.planId}
                handlePlanSelection={onPlanSelected}
                handlePaymentIndividual={handlePaymentIndividual}
                isPaying={isPaying}
                isBusiness={true}
                handlePaymentTeams={handlePaymentTeams}
              />
            ))}
        </div>
      )}

      {/* FEATURES */}
      <span className="block mx-auto w-max text-center text-neutral-500 my-6">
        {i18n.get('views.account.tabs.plans.viewAllFeatures')}
      </span>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">{featuresList}</div>
    </div>
  );
};

export default AccountPlansTab;
