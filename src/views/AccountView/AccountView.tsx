import { Component } from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import AccountBillingTab from './tabs/AccountBillingTab/AccountBillingTab';
import AccountPasswordTab from './tabs/AccountPasswordTab/AccountPasswordTab';
import AccountReferralsTab from './tabs/AccountReferralsTab/AccountReferralsTab';
import AccountSecurityTab from './tabs/AccountSecurityTab/AccountSecurityTab';

interface AccountViewProps { }

interface AccountViewState { }

class AccountView extends Component<AccountViewProps, AccountViewState> {
  constructor(props: AccountViewProps) {
    super(props);

    this.state = {
      page: null,
      processing: false,
      isAppSumo: false,
      appSumoDetails: null,
      isLoading: true
    };
  }

  render(): JSX.Element {
    return (
      <div className='h-full rounded-md bg-white test pb-16'>
        <Tabs defaultActiveKey="billing" className='relative flex px-8 pt-3.5' >
          <Tab title='Billing' eventKey='billing'>
            <AccountBillingTab />
          </Tab>

          <Tab title='Password' eventKey='password'>
            <AccountPasswordTab />
          </Tab>

          <Tab title='Referrals' eventKey='referrals'>
            <AccountReferralsTab />
          </Tab>

          <Tab title='Security' eventKey='security'>
            <AccountSecurityTab />
          </Tab>

          <Tab title='Business' eventKey='business'>
          </Tab>

          <Tab title='' className='w-full h-full' >
          </Tab>
        </Tabs>
      </div>
    );
  }
}

export default AccountView;
