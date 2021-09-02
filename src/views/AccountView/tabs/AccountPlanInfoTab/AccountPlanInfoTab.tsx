import { Fragment, useState } from 'react';
import { UilUserCircle, UilEnvelope, UilCheck } from '@iconscout/react-unicons';

import { getUserLimitString } from '../../../../services/usage.service';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setCurrentAccountTab } from '../../../../store/slices/ui';
import { planSelectors } from '../../../../store/slices/plan';
import { AccountViewTab } from '../../AccountView';
import configService from '../../../../services/config.service';
import { sessionSelectors } from '../../../../store/slices/session/session.selectors';

import './AccountPlanInfoTab.scss';
import DeleteAccountDialog from '../../../../components/dialogs/DeleteAccountDialog/DeleteAccountDialog';
import { bytesToString } from '../../../../services/size.service';

const AccountPlanInfoTab = (): JSX.Element => {
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const user = useAppSelector((state) => state.user.user);
  const isLoadingPlanLimit = useAppSelector((state) => state.plan.isLoadingPlanLimit);
  const planUsage = useAppSelector((state) => state.plan.planUsage);
  const planLimit = useAppSelector(planSelectors.planLimitToShow);
  const isLoadingPlans = useAppSelector((state) => state.plan.isLoadingPlans);
  const currentPlan = useAppSelector(planSelectors.currentPlan);
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const isCurrentPlanLifetime = useAppSelector(planSelectors.isCurrentPlanLifetime);
  const dispatch = useAppDispatch();
  const onUpgradeButtonClicked = () => {
    dispatch(setCurrentAccountTab(AccountViewTab.Plans));
  };
  const onDeletePermanentlyAccountClicked = (): void => {
    setIsDeleteAccountDialogOpen(true);
  };
  const getPlanName = () => {
    let planName;

    if (currentPlan) {
      planName = currentPlan.name;
    } else {
      planName = getUserLimitString(planLimit);
    }

    return planName;
  };
  const progressBarFillWidth = isLoadingPlans || isLoadingPlanLimit ? 0 : (planUsage / planLimit) * 100 + '%';
  const progressBarFillStyle = { width: progressBarFillWidth };

  return (
    <Fragment>
      <DeleteAccountDialog isOpen={isDeleteAccountDialogOpen} onClose={() => setIsDeleteAccountDialogOpen(false)} />

      <div className="flex flex-col w-full h-full items-center">
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 w-full justify-around">
          {/* USER CARD */}
          <div className="flex justify-center">
            <div className="flex flex-col w-64 h-64 rounded-lg bg-l-neutral-20">
              <div className="flex flex-1 items-center justify-center">
                <UilUserCircle className="text-blue-60 w-20 h-20" />
              </div>

              <div className="flex flex-col justify-center items-center h-20 border-t border-white">
                <span className="label_small">Name</span>
                {isTeam ? (
                  <span className="subtitle m-0">Business</span>
                ) : (
                  <span className="subtitle m-0">
                    {user?.name} {user?.lastname}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* PERSONAL INFORMATION */}
          <div className="flex justify-center">
            <div className="flex flex-col items-start h-full">
              <h2 className="account_config_title mb-3">Personal information</h2>

              <div className="flex items-center">
                <UilUserCircle className="label_icon" />
                <span className="label_small">Name</span>
              </div>
              {isTeam ? (
                <span className="subtitle">Business</span>
              ) : (
                <span className="subtitle">
                  {user?.name} {user?.lastname}
                </span>
              )}

              <div className="flex items-center">
                <UilEnvelope className="label_icon" />
                <span className="label_small">Email</span>
              </div>
              <span className="subtitle">{user?.email}</span>

              <h2 className="account_config_title mt-0.5 mb-2">Usage</h2>
              <div className="flex flex-col items-start justify-center w-60 bg-l-neutral-20 rounded-md py-3 px-6">
                {isLoadingPlans || isLoadingPlanLimit ? (
                  <span className="text-center w-full">Loading...</span>
                ) : (
                  <span className="account_config_description w-full m-0">
                    {bytesToString(planUsage) || '0'} of {getUserLimitString(planLimit)}
                  </span>
                )}

                <div className="flex justify-start h-1.5 w-full bg-blue-20 rounded-lg overflow-hidden mt-3">
                  <div className="h-full bg-blue-70" style={progressBarFillStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* CURRENT PLAN */}
          <div className="flex justify-center">
            <div className="w-56">
              <h2 className="account_config_title">Current plan</h2>

              {!isLoadingPlans ? (
                <div className="flex flex-col w-full">
                  <Fragment>
                    <span className="text-neutral-700 font-semibold text-sm">{currentPlan?.simpleName}</span>

                    <div className="flex w-full items-end justify-center rounded border border-blue-60 text-neutral-500 px-4 py-1 my-3">
                      {currentPlan?.planId ? (
                        <Fragment>
                          <span className="font-bold">{currentPlan?.price}€</span>
                          <span className="text-xs mb-1 ml-2">/{currentPlan?.paymentInterval}</span>
                        </Fragment>
                      ) : (
                        <span className="font-bold">{!isCurrentPlanLifetime ? 'Free plan' : 'Lifetime'}</span>
                      )}
                    </div>
                  </Fragment>

                  {!isCurrentPlanLifetime &&
                    configService.getAppConfig().plan.defaultFeatures.map((text, index) => (
                      <div key={index} className="flex justify-start items-center mb-2">
                        <UilCheck className="text-blue-60" />
                        <p className="text-xs ml-2.5">{text}</p>
                      </div>
                    ))}

                  <button
                    className={`${isCurrentPlanLifetime ? 'hidden' : ''} primary w-full`}
                    onClick={onUpgradeButtonClicked}
                  >
                    Upgrade
                  </button>
                </div>
              ) : (
                <span className="">Loading plan...</span>
              )}
            </div>
          </div>
        </div>
        <span className="text-m-neutral-80 cursor-pointer mt-10" onClick={onDeletePermanentlyAccountClicked}>
          Permanently delete account
        </span>
      </div>
    </Fragment>
  );
};

export default AccountPlanInfoTab;
