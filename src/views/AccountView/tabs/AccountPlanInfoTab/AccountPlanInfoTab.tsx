import React, { useEffect } from 'react';
import { useState } from 'react';
import SessionStorage from '../../../../lib/sessionStorage';
import { bytesToString } from '../../../../services/size.service';
import usageService, { putLimitUser } from '../../../../services/usage.service';
import { useAppSelector } from '../../../../store/hooks';
import { selectUser, selectUserPlan } from '../../../../store/slices/user';

const AccountPlanInfoTab = (): JSX.Element => {
  const [usage, setUsage] = useState(0);
  const limit = parseInt(SessionStorage.get('limitStorage') || (1024 * 1024 * 1024 * 2).toString());
  const user = useAppSelector(selectUser);
  const userPlan = useAppSelector(selectUserPlan);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUsage = async () => {
      const usage = await usageService.fetchUsage();

      console.log('usage =>', usage);
      setUsage(usage.total);
    };

    getUsage();
  }, []);

  return (
    <div className='flex justify-around w-full pt-8'>
      <div className='flex flex-col items-start'>
        <h2 className='account_config_title'>Personal information</h2>

        <span className='account_config_description mt-4'>{user?.name} {user?.lastname}</span>
        <span className='account_config_description'>{user?.email}</span>
      </div>

      <div className='flex flex-col w-56 items-start'>
        <h2 className='account_config_title'>Usage</h2>

        <span className='account_config_description mt-4'>{bytesToString(usage)} of {putLimitUser(limit)}</span>
        <div className='flex justify-start h-1.5 w-full bg-blue-20 rounded-lg overflow-hidden mt-3'>
          <div className='h-full bg-blue-70' style={{ width: (usage / limit) * 100 }} />
        </div>
      </div>

      <div className='flex flex-col w-56 items-start'>
        <h2 className='account_config_title'>Current plan</h2>

        <span className='text-neutral-700 font-semibold text-sm'>{userPlan?.name} | {userPlan?.paymentInterval}</span>

        <div className='flex w-full items-end justify-center rounded border border-blue-60 text-neutral-500 px-4 py-1 my-3'>
          <span className='font-bold'>{userPlan?.price}€</span>
          <span className='text-xs mb-1 ml-2'>/{userPlan?.paymentInterval}</span>
        </div>

        <button className='primary w-full'>
          Change plan
        </button>
      </div>
    </div>
  );
};

export default AccountPlanInfoTab;
