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
import { uiActions } from '../../store/slices/ui';

export enum AccountViewTab {
  Billing = 'billing',
  Plans = 'plans',
  Password = 'password',
  Security = 'security'
}
interface AccountViewProps {
  dispatch: AppDispatch;
  currentTab: string;
}
interface AccountViewState {}
class AccountView extends Component<AccountViewProps, AccountViewState> {
  constructor(props: AccountViewProps) {
    super(props);

    this.state = { };
  }

  componentDidMount() {
    this.props.dispatch(planThunks.initializeThunk());
  }

  onTabSelected = (tabKey: string) => {
    tabKey && this.props.dispatch(uiActions.setCurrentAccountTab(tabKey));
  }

  render(): JSX.Element {
    const plansCharacteristics = ['Web, Desktop & Mobile apps', 'Unlimited devices', 'Secure file sharing'];

    return (
      <div className='h-full rounded-md bg-white test pb-16 mt-2'>
        <Tabs activeKey={this.props.currentTab} onSelect={this.onTabSelected} className='relative flex px-8 pt-3.5' >
          <Tab title='Billing' eventKey={AccountViewTab.Billing}>
            <AccountPlanInfoTab plansCharacteristics={plansCharacteristics} />
          </Tab>

          <Tab title='Plans' eventKey={AccountViewTab.Plans}>
            <AccountBillingTab plansCharacteristics={plansCharacteristics} />
          </Tab>

          <Tab title='Password' eventKey={AccountViewTab.Password}>
            <AccountPasswordTab />
          </Tab>

          <Tab title='Security' eventKey={AccountViewTab.Security}>
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