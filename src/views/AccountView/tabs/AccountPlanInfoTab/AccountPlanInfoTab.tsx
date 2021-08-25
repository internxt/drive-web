import { Fragment, useState } from 'react';
import { UilUserCircle, UilEnvelope } from '@iconscout/react-unicons';

import { getUserLimitString } from '../../../../services/usage.service';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { selectUserPlan, setIsLoadingStripePlan } from '../../../../store/slices/user';
import { ListItem } from '../AccountPlansTab/BillingPlanItem';
import { selectorIsTeam } from '../../../../store/slices/team';
import { setCurrentAccountTab } from '../../../../store/slices/ui';
import { planSelectors, PlanState } from '../../../../store/slices/plan';
import { AccountViewTab } from '../../AccountView';

import './AccountPlanInfoTab.scss';
import DeleteAccountDialog from '../../../../components/dialogs/DeleteAccountDialog/DeleteAccountDialog';
import PlanUsage from '../../../../components/PlanUsage';

const AccountPlanInfoTab = ({ plansCharacteristics }: { plansCharacteristics: string[] }): JSX.Element => {
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const plan: PlanState = useAppSelector((state) => state.plan);
  const user = useAppSelector((state) => state.user.user);
  const userPlan = useAppSelector(selectUserPlan);
  const isTeam = useAppSelector(selectorIsTeam);
  const isLoadingStripe = useAppSelector(setIsLoadingStripePlan);
  const hasLifetimePlan = useAppSelector(planSelectors.hasLifetimePlan);
  const dispatch = useAppDispatch();
  const onUpgradeButtonClicked = () => {
    dispatch(setCurrentAccountTab(AccountViewTab.Plans));
  };
  const onDeletePermanentlyAccountClicked = (): void => {
    setIsDeleteAccountDialogOpen(true);
  };

  const planName = () => {
    let planName;

    if (!isLoadingStripe) {
      if (userPlan) {
        planName = userPlan.name;
      } else {
        planName = getUserLimitString(plan.limit);
      }
    }
    return planName;
  };

  return (
    <Fragment>
      <DeleteAccountDialog isOpen={isDeleteAccountDialogOpen} onClose={() => setIsDeleteAccountDialogOpen(false)} />

      <div className="flex flex-col w-full h-full items-center">
        <div className='flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 w-full justify-around'>

          {/* USER CARD */}
          <div className="flex justify-center">
            <div className='flex flex-col w-64 h-64 rounded-lg bg-l-neutral-20'>
              <div className='flex flex-1 items-center justify-center'>
                <UilUserCircle className='text-blue-60 w-20 h-20' />
              </div>

              <div className='flex flex-col justify-center items-center h-20 border-t border-white'>
                <span className='label_small'>Name</span>
                {isTeam ?
                  <span className='subtitle m-0'>Business</span>
                  :
                  <span className='subtitle m-0'>{user?.name} {user?.lastname}</span>
                }
              </div>
            </div>
          </div>

          {/* PERSONAL INFORMATION */}
          <div className="flex justify-center">
            <div className='flex flex-col items-start h-full'>
              <h2 className='account_config_title mb-3'>Personal information</h2>

              <div className='flex items-center'>
                <UilUserCircle className='label_icon' />
                <span className='label_small'>Name</span>
              </div>
              {isTeam ?
                <span className='subtitle'>Business</span>
                :
                <span className='subtitle'>{user?.name} {user?.lastname}</span>
              }

              <div className='flex items-center'>
                <UilEnvelope className='label_icon' />
                <span className='label_small'>Email</span>
              </div>
              <span className='subtitle'>{user?.email}</span>

              <h2 className='account_config_title mt-0.5 mb-1'>Usage</h2>
              <PlanUsage className="px-6" {...plan}/>
            </div>
          </div>

          {/* CURRENT PLAN */}
          <div className="flex justify-center">
            <div className='w-56'>
              <h2 className='account_config_title'>Current plan</h2>

              <div className='flex flex-col w-full'>
                <span className='text-neutral-700 font-semibold text-sm'>{planName()}</span>

                <div className='flex w-full items-end justify-center rounded border border-blue-60 text-neutral-500 px-4 py-1 my-3'>
                  {!isLoadingStripe ?
                    <Fragment>
                      {
                        userPlan ?
                          <Fragment>
                            <span className='font-bold'>{userPlan?.price}€</span>
                            <span className='text-xs mb-1 ml-2'

                            >/{userPlan?.paymentInterval}</span>
                          </Fragment>
                          :
                          <span className='font-bold'>
                            {!hasLifetimePlan ? 'Free plan' : 'Lifetime'}
                          </span>
                      }
                    </Fragment>
                    :
                    <span className='font-bold'>Loading plan...</span>
                  }
                </div>

                {!hasLifetimePlan && plansCharacteristics.map((text, index) => <ListItem text={text} key={index} />)}

                <button className={`${hasLifetimePlan ? 'hidden' : ''} primary w-full`} onClick={onUpgradeButtonClicked}>
                Upgrade
                </button>
              </div>
            </div>
          </div>
        </div>

        <span
          className="text-m-neutral-80 cursor-pointer mt-10"
          onClick={onDeletePermanentlyAccountClicked}
        >Permanently delete account</span>
      </div>
    </Fragment>

  );
};

export default AccountPlanInfoTab;
