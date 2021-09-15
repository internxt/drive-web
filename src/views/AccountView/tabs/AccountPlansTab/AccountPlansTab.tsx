import { useState } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import ProductItem from '../../../../components/ProductItem/ProductItem';
import { RenewalPeriod, Workspace } from '../../../../models/enums';
import i18n from '../../../../services/i18n.service';
import { useAppSelector } from '../../../../store/hooks';

import './AccountPlansTab.scss';
import { productsSelectors } from '../../../../store/slices/products';

const AccountPlansTab = (): JSX.Element => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(Workspace.Individuals);
  const [currentRenewalPeriod, setCurrentRenewalPeriod] = useState<RenewalPeriod>(RenewalPeriod.Annually);
  const isBuying = useAppSelector((state) => state.payment.isBuying);
  const individualPlan = useAppSelector((state) => state.plan.individualPlan);
  const teamPlan = useAppSelector((state) => state.plan.teamPlan);
  const isLoadingProducts = useAppSelector((state) => state.products.isLoading);
  const individualProducts = useAppSelector(productsSelectors.individualProducts)(currentRenewalPeriod);
  const teamProducts = useAppSelector(productsSelectors.teamProducts)(currentRenewalPeriod);
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
    [Workspace.Individuals]: i18n.get(`views.account.tabs.plans.changeWorkspace.business`),
    [Workspace.Business]: i18n.get('views.account.tabs.plans.changeWorkspace.personal'),
  };
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
      className="w-56 h-56 flex flex-col justify-center items-center border border-l-neutral-30 rounded-lg text-center p-6 m-3"
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
        {changePlansWorkspaceLabelMap[currentWorkspace]}
      </span>

      {isLoadingProducts ? (
        <span className="block w-full text-center">{i18n.get('general.loading.default')}</span>
      ) : (
        <div className="flex flex-wrap justify-center items-center">
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
    </div>
  );
};

export default AccountPlansTab;
