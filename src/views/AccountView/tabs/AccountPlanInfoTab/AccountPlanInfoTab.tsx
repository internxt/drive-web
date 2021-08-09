import { Fragment, useEffect, useState } from 'react';
import { UilUserCircle, UilEnvelope } from '@iconscout/react-unicons';

import { bytesToString } from '../../../../services/size.service';
import usageService, { getUserLimitString } from '../../../../services/usage.service';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { selectUserPlan, setIsLoadingStripePlan } from '../../../../store/slices/user';
import { ListItem } from '../AccountPlansTab/BillingPlanItem';
import { selectorIsTeam } from '../../../../store/slices/team';
import { setCurrentAccountTab } from '../../../../store/slices/ui';
import { planSelectors } from '../../../../store/slices/plan';
import { AccountViewTab } from '../../AccountView';

import './AccountPlanInfoTab.scss';

const AccountPlanInfoTab = ({ plansCharacteristics }: { plansCharacteristics: string[] }): JSX.Element => {
  const [usage, setUsage] = useState(0);
  const isLoadingPlanLimit = useAppSelector((state) => state.plan.isLoading);
  const planLimit = useAppSelector((state) => state.plan.planLimit);
  const user = useAppSelector((state) => state.user.user);
  const userPlan = useAppSelector(selectUserPlan);
  const isTeam = useAppSelector(selectorIsTeam);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingStripe = useAppSelector(setIsLoadingStripePlan);
  const hasLifetimePlan = useAppSelector(planSelectors.hasLifetimePlan);
  const dispatch = useAppDispatch();
  const onUpgradeButtonClicked = () => {
    dispatch(setCurrentAccountTab(AccountViewTab.Plans));
  };

  useEffect(() => {
    const getUsage = async () => {
      setIsLoading(true);
      try {
        const usage = await usageService.fetchUsage(isTeam);

        setUsage(usage.total);
      } catch (err) {
        console.error('Could not load current user usage.', err);
      } finally {
        setIsLoading(false);
      }

    };

    getUsage();
  }, [isTeam]);

  const planName = () => {
    let planName;

    if (!isLoadingStripe) {
      if (userPlan) {
        planName = userPlan.name;
      } else {
        planName = getUserLimitString(planLimit);
      }
    }
    return planName;
  };

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 w-full h-60 justify-around py-8'>

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
          <div className='flex flex-col items-center justify-center w-56 h-14 bg-l-neutral-20 rounded-md px-6'>
            {isLoading || isLoadingPlanLimit ?
              <span>Loading...</span> :
              <span className='account_config_description m-0'>{bytesToString(usage)} of {getUserLimitString(planLimit)}</span>
            }

            <div className='flex justify-start h-1.5 w-full bg-blue-20 rounded-lg overflow-hidden mt-1'>
              <div className='h-full bg-blue-70' style={{ width: (usage / planLimit) * 100 }} />
            </div>
          </div>
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
  );
};

export default AccountPlanInfoTab;
