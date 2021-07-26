import React from 'react';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import './accountConfiguration.scss';
import Plans from './Plans';
import ChangePassword from './Password';
import Referrals from './Referrals';
import Security from './Security';

const AccountConfiguration = (): JSX.Element => {
  return (
    <div className='h-full rounded-md bg-white test pb-16'>
      <Tabs defaultActiveKey="plans" className='relative flex px-8 pt-3.5' >
        <Tab title='Plans' eventKey='plans'>
          <Plans />
        </Tab>

        <Tab title='Password' eventKey='password'>
          <ChangePassword />
        </Tab>

        <Tab title='Referrals' eventKey='referrals'>
          <Referrals />
        </Tab>

        <Tab title='Security' eventKey='security'>
          <Security />
        </Tab>

        <Tab title='Business' eventKey='business'>
        </Tab>

        <Tab title='' className='w-full h-full' >
        </Tab>
      </Tabs>
    </div>
  );
};

export default AccountConfiguration;
