import { Fragment, useState } from 'react';
import UilShieldPlus from '@iconscout/react-unicons/icons/uil-shield-plus';

import ProductItem from 'app/payment/components/ProductItem/ProductItem';
import i18n from 'app/i18n/services/i18n.service';
import { useAppSelector } from 'app/store/hooks';

import './AccountPlansTab.scss';
import { productsSelectors } from 'app/store/slices/products';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { planSelectors } from 'app/store/slices/plan';
import { Workspace } from '../../../../types';
import { RenewalPeriod } from 'app/payment/types';

const AccountPlansTab = (): JSX.Element => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(Workspace.Individuals);
  const [currentRenewalPeriod, setCurrentRenewalPeriod] = useState<RenewalPeriod>(RenewalPeriod.Annually);
  const isBuying = useAppSelector((state) => state.payment.isBuying);
  const individualPlan = useAppSelector((state) => state.plan.individualPlan);
  const teamPlan = useAppSelector((state) => state.plan.teamPlan);
  const isLoadingProducts = useAppSelector((state) => state.products.isLoading);
  const individualProducts = useAppSelector(productsSelectors.individualProducts)(currentRenewalPeriod);
  const teamProducts = useAppSelector(productsSelectors.teamProducts)(currentRenewalPeriod);
  const currentPlan = useAppSelector(planSelectors.currentPlan);

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
  const changePlansWorkspaceLabelMap = {
    [Workspace.Individuals]: i18n.get('views.account.tabs.plans.changeWorkspace.business'),
    [Workspace.Business]: i18n.get('views.account.tabs.plans.changeWorkspace.personal'),
  };
  const onChangePlansWorkspaceClicked = () => {
    const workspaceKeys = Object.values(Workspace);
    const currentWorkspaceIndex = workspaceKeys.findIndex((key) => key === currentWorkspace);
    const nextWorkspace = workspaceKeys[(currentWorkspaceIndex + 1) % workspaceKeys.length];

    setCurrentWorkspace(nextWorkspace);
  };
  const onAppSumoButtonClicked = () => {
    window.open(
      // eslint-disable-next-line max-len
      `https://appsumo.8odi.net/c/2715655/416948/7443?sharedid=button1&u=https://appsumo.com/account/redemption/${currentPlan?.details?.invoiceItemUuid}`,
      '_blank',
    );
  };
  const features = [
    {
      icon: UilShieldPlus,
      title: i18n.get('views.account.tabs.plans.features.0.title'),
      description: i18n.get('views.account.tabs.plans.features.0.description'),
    },
    {
      icon: UilShieldPlus,
      title: i18n.get('views.account.tabs.plans.features.1.title'),
      description: i18n.get('views.account.tabs.plans.features.1.description'),
    },
    {
      icon: UilShieldPlus,
      title: i18n.get('views.account.tabs.plans.features.2.title'),
      description: i18n.get('views.account.tabs.plans.features.2.description'),
    },
  ];
  const featuresList = features.map((feature, index) => (
    <div
      key={index}
      className="w-56 h-56 flex flex-col justify-center items-center\
       border border-l-neutral-30 rounded-lg text-center p-6 m-3"
    >
      <feature.icon className="text-blue-40 mb-2" />
      <span className="block text-neutral-900 mb-2">{feature.title}</span>
      <span className="block text-m-neutral-100 text-sm">{feature.description}</span>
    </div>
  ));

  return (
    <div className="group w-full h-fit">
      {currentPlan?.isAppSumo ? (
        <div>
          <span className="block w-full text-center">{i18n.get('appSumo.plans.advice')}</span>
          <BaseButton className="mx-auto mt-5 primary" onClick={onAppSumoButtonClicked}>
            Change plan
          </BaseButton>
        </div>
      ) : (
        <Fragment>
          {/* PERIOD SELECTOR */}
          <div className="mx-auto mb-6 rounded-lg bg-l-neutral-20 h-10 w-96 flex py-1 px-0.5">{renewalPeriodList}</div>

          {/* CHANGE PLANS WORKSPACE */}
          <span
            className="block mx-auto w-max text-center text-blue-60 font-semibold mb-4 cursor-pointer"
            onClick={onChangePlansWorkspaceClicked}
          >
            {changePlansWorkspaceLabelMap[currentWorkspace]}
          </span>

          {isLoadingProducts ? (
            <span className="block w-full text-center">{i18n.get('general.loading.default')}</span>
          ) : (
            <div className="flex flex-wrap justify-center items-end">
              {currentWorkspace === Workspace.Individuals &&
                individualProducts.map((product, i) => (
                  <ProductItem
                    key={i}
                    product={product}
                    currentPlanId={individualPlan?.planId}
                    isBuyButtonDisabled={isBuying}
                    isBusiness={false}
                  />
                ))}

              {currentWorkspace === Workspace.Business &&
                teamProducts.map((product, i) => (
                  <ProductItem
                    key={i}
                    product={product}
                    currentPlanId={teamPlan?.planId}
                    isBuyButtonDisabled={isBuying}
                    isBusiness={true}
                  />
                ))}
            </div>
          )}

          {/* FEATURES */}
          <span className="block mx-auto w-max text-center text-neutral-500 my-6">
            {i18n.get('views.account.tabs.plans.viewAllFeatures')}
          </span>
          <div className="flex flex-wrap justify-center content-center">{featuresList}</div>
        </Fragment>
      )}
    </div>
  );
};

export default AccountPlansTab;
