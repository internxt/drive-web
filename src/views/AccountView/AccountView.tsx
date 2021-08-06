import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Component } from 'react';

import './AccountView.scss';
import AccountBillingTab from './tabs/AccountBillingTab/AccountBillingTab';
import AccountPasswordTab from './tabs/AccountPasswordTab/AccountPasswordTab';
import AccountSecurityTab from './tabs/AccountSecurityTab/AccountSecurityTab';
import AccountPlanInfoTab from './tabs/AccountPlanInfoTab/AccountPlanInfoTab';
import { AppDispatch, RootState } from '../../store';
import { connect } from 'react-redux';
import { planThunks } from '../../store/slices/plan';

interface AccountViewState {
  currentTab: string;
  dispatch: AppDispatch;
}
class AccountView extends Component<{}, AccountViewState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      currentTab: 'billing'
    };
  }

  componentDidMount() {
    this.props.dispatch(planThunks.initializeThunk());
  }

  render(): JSX.Element {
    const plansCharacteristics = ['Web, Desktop & Mobile apps', 'Unlimited devices', 'Secure file sharing'];

    return (
      <div className='h-full rounded-md bg-white test pb-16 mt-2'>
        <Tabs activeKey={this.state.currentTab} onSelect={key => key && this.setState({ currentTab: key })} defaultActiveKey="billing" className='relative flex px-8 pt-3.5' >
          <Tab title='Billing' eventKey='billing'>
            <AccountPlanInfoTab plansCharacteristics={plansCharacteristics} />
          </Tab>

          <Tab title='Plans' eventKey='plans'>
            <AccountBillingTab plansCharacteristics={plansCharacteristics} />
          </Tab>

          <Tab title='Password' eventKey='password'>
            <AccountPasswordTab />
          </Tab>

          {/* <Tab title='Referrals' eventKey='referrals'>
        <AccountReferralsTab />
      </Tab> */}

          <Tab title='Security' eventKey='security'>
            <AccountSecurityTab />
          </Tab>

          <Tab title='' className='w-full h-full' >
          </Tab>
        </Tabs>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => {
    return {
      currentTab: state.ui.currentAccountTab
    };
  })(AccountView);