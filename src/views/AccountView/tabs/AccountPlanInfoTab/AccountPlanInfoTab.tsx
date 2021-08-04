import React, { Fragment, useEffect } from 'react';
import { useState } from 'react';
import SessionStorage from '../../../../lib/sessionStorage';
import { bytesToString } from '../../../../services/size.service';
import usageService, { putLimitUser } from '../../../../services/usage.service';
import { useAppSelector } from '../../../../store/hooks';
import { selectUser, selectUserPlan } from '../../../../store/slices/user';
import { UilUserCircle, UilEnvelope } from '@iconscout/react-unicons';
import './AccountPlanInfoTab.scss';
import { ListItem } from '../AccountBillingTab/BillingPlanItem';
import { selectorIsTeam } from '../../../../store/slices/team';

const AccountPlanInfoTab = ({ plansCharacteristics }: { plansCharacteristics: string[] }): JSX.Element => {
  const [usage, setUsage] = useState(0);
  const limitPersonal = parseInt(SessionStorage.get('limitStorage') || (1024 * 1024 * 1024 * 2).toString());
  const limitBusiness = parseInt(SessionStorage.get('teamsStorage') || (1024 * 1024 * 1024 * 2).toString());
  const user = useAppSelector(selectUser);
  const userPlan = useAppSelector(selectUserPlan);
  const isTeam = useAppSelector(selectorIsTeam);
  const [isLoading, setIsLoading] = useState(false);

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

  const limitUser = () => {
    let limit;

    if (isTeam) {
      limit = putLimitUser(limitBusiness);
    } else {
      limit = putLimitUser(limitPersonal);
    }
    return limit;
  };

  return (
    <div className='flex justify-around w-full pt-8'>
      <div className='flex w-full h-60 justify-around'>
        <div className='flex flex-col w-64 h-full rounded-lg bg-l-neutral-20'>
          <div className='flex flex-1 items-center justify-center'>
            <UilUserCircle className='text-blue-60 w-20 h-20' />
          </div>

          <div className='flex flex-col justify-center items-center h-20 border-t border-white'>
            <span className='label_small'>Name</span>
            <span className='subtitle m-0'>{user?.name} {user?.lastname}</span>
          </div>
        </div>

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
            {isLoading ?
              <span>Loading usage...</span>
              :
              <span className='account_config_description m-0'>{bytesToString(usage)} of {limitUser()}</span>
            }

            <div className='flex justify-start h-1.5 w-full bg-blue-20 rounded-lg overflow-hidden mt-1'>
              <div className='h-full bg-blue-70' style={{ width: (usage / limitUser()) * 100 }} />
            </div>
          </div>
        </div>

        <div className='flex flex-col w-56 items-start justify-between'>
          <h2 className='account_config_title'>Current plan</h2>

          <div className='flex flex-col w-full'>
            <span className='text-neutral-700 font-semibold text-sm'>{userPlan?.name}</span>

            <div className='flex w-full items-end justify-center rounded border border-blue-60 text-neutral-500 px-4 py-1 my-3'>
              {userPlan ?
                <Fragment>
                  <span className='font-bold'>{userPlan?.price}€</span>
                  <span className='text-xs mb-1 ml-2'>/{userPlan?.paymentInterval}</span>
                </Fragment>
                :
                <span className='font-bold'>Loading plan...</span>
              }
            </div>

            {plansCharacteristics.map((text, index) => <ListItem text={text} key={index} />)}

            <button className='primary w-full' onClick={() => console.log('clicked')}>
              Change plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPlanInfoTab;
