import React, { useEffect } from 'react';
import { useState } from 'react';
import SessionStorage from '../../../../lib/sessionStorage';
import { bytesToString } from '../../../../services/size.service';
import usageService, { putLimitUser } from '../../../../services/usage.service';
import { useAppSelector } from '../../../../store/hooks';
import { selectorIsTeam } from '../../../../store/slices/team';
import { selectUser } from '../../../../store/slices/user';

const AccountPlanInfoTab = () => {
  const [usage, setUsage] = useState(0);
  const limit = parseInt(SessionStorage.get('limitStorage') || (1024 * 1024 * 1024 * 2).toString());
  const user = useAppSelector(selectUser);
  const isTeam = useAppSelector(selectorIsTeam);

  useEffect(() => {
    usageService.fetchUsage(isTeam).then(res => setUsage(res.total));
  }, []);

  return (
    <div className='flex justify-around w-full'>
      <div className='flex flex-col items-start'>
        <h2 className='account_config_title'>Personal information</h2>

        <span className='account_config_description mt-4'>{user?.name} {user?.lastname}</span>
        <span className='account_config_description'>{user?.email}</span>
      </div>

      <div className='flex flex-col w-56 items-start'>
        <h2 className='account_config_title'>Usage</h2>

        <span className='account_config_description mt-4'>{bytesToString(usage)} of {putLimitUser(limit)}</span>
        <div className='flex justify-start h-1.5 w-full bg-blue-20 rounded-lg overflow-hidden'>
          <div className='h-full bg-blue-70' style={{ width: (usage / limit) * 100 }} />
        </div>
      </div>

      <div className='flex flex-col w-56 items-start'>
        <h2 className='account_config_title'>Current plan</h2>
      </div>
    </div>
  );
};

export default AccountPlanInfoTab;
