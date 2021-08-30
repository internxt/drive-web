import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Component } from 'react';
import queryString from 'query-string';
import { SelectCallback } from 'react-bootstrap/esm/helpers';

import AccountPlansTab from './tabs/AccountPlansTab/AccountPlansTab';
import AccountPasswordTab from './tabs/AccountPasswordTab/AccountPasswordTab';
import AccountSecurityTab from './tabs/AccountSecurityTab/AccountSecurityTab';
import AccountPlanInfoTab from './tabs/AccountPlanInfoTab/AccountPlanInfoTab';
import { AppDispatch, RootState } from '../../store';
import { connect } from 'react-redux';
import { uiActions } from '../../store/slices/ui';
import history from '../../lib/history';

import './AccountView.scss';

export enum AccountViewTab {
  Billing = 'billing',
  Plans = 'plans',
  Password = 'password',
  Security = 'security',
}
interface AccountViewProps {
  dispatch: AppDispatch;
  currentTab: string;
}
class AccountView extends Component<AccountViewProps> {
  constructor(props: AccountViewProps) {
    super(props);
  }

  componentDidMount() {
    const locationQueryParams = queryString.parse(history.location.search);
    const queryTab = locationQueryParams.tab;

    if (
      queryTab &&
      Object.values(AccountViewTab).includes(queryTab as AccountViewTab) &&
      this.props.currentTab !== queryTab
    ) {
      this.props.dispatch(uiActions.setCurrentAccountTab(queryTab as string));
    }
  }

  onTabSelected: SelectCallback = (tabKey) => {
    tabKey && this.props.dispatch(uiActions.setCurrentAccountTab(tabKey));
  };

  render(): JSX.Element {
    return (
      <div className="account-view h-full rounded-md bg-white pb-16 mt-2 ">
        <Tabs activeKey={this.props.currentTab} onSelect={this.onTabSelected} className="flex px-8 pt-3.5 account-tabs">
          <Tab title="Billing" eventKey={AccountViewTab.Billing}>
            <AccountPlanInfoTab />
          </Tab>

          <Tab title="Plans" eventKey={AccountViewTab.Plans}>
            <AccountPlansTab />
          </Tab>

          <Tab title="Password" eventKey={AccountViewTab.Password}>
            <AccountPasswordTab />
          </Tab>

          <Tab title="Security" eventKey={AccountViewTab.Security}>
            <AccountSecurityTab />
          </Tab>
        </Tabs>
      </div>
    );
  }
}

export default connect((state: RootState) => {
  return {
    currentTab: state.ui.currentAccountTab,
  };
})(AccountView);
