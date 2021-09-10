import * as Unicons from '@iconscout/react-unicons';
import { Component } from 'react';
import queryString from 'query-string';

import tabs, { AccountViewTab, AccountViewTabData } from './tabs';
import { AppDispatch, RootState } from '../../store';
import { connect } from 'react-redux';
import { uiActions } from '../../store/slices/ui';

import './AccountView.scss';
import navigationService from '../../services/navigation.service';
import i18n from '../../services/i18n.service';

interface AccountViewProps {
  dispatch: AppDispatch;
  currentTab: AccountViewTab;
}
class AccountView extends Component<AccountViewProps> {
  constructor(props: AccountViewProps) {
    super(props);
  }

  componentDidMount() {
    const locationQueryParams = queryString.parse(navigationService.history.location.search);
    const queryTab = locationQueryParams.tab;

    if (
      queryTab &&
      Object.values(AccountViewTab).includes(queryTab as AccountViewTab) &&
      this.props.currentTab !== queryTab
    ) {
      this.props.dispatch(uiActions.setCurrentAccountTab(queryTab as AccountViewTab));
    }
  }

  onTabSelected = (tabKey: AccountViewTab): void => {
    tabKey && this.props.dispatch(uiActions.setCurrentAccountTab(tabKey));
  };

  render(): JSX.Element {
    const { currentTab } = this.props;
    const CurrentTabComponent = tabs.find((tab) => tab.id === currentTab)?.component as () => JSX.Element;
    const tabItemFactory = (tab: AccountViewTabData) => (
      <div
        key={tab.id}
        onClick={() => this.onTabSelected(tab.id)}
        className={`tab-item ${tab.id === currentTab ? 'active' : ''}`}
      >
        <div className="flex mb-2">
          <tab.icon className="text-blue-40 mr-2" />
          <span className="font-semibold mr-3 text-base">{tab.title}</span>
          <Unicons.UilAngleDoubleRight className="" />
        </div>
        <p className="text-sm">{tab.description}</p>
      </div>
    );
    const tabsList = tabs.map((tab) => tabItemFactory(tab));

    return (
      <div className="account-view">
        {/* TABS */}
        <div className="mr-8">
          <h1 className="mb-4 pl-3 text-neutral-700 font-semibold">{i18n.get('views.account.title')}</h1>
          <div className="tabs-container">{tabsList}</div>
        </div>

        {/* CURRENT TAB */}
        <div className="max-w-4xl w-full h-full pl-6 flex flex-col overflow-y-auto">
          <CurrentTabComponent />
        </div>
      </div>
    );
  }
}

export default connect((state: RootState) => {
  return {
    currentTab: state.ui.currentAccountTab,
  };
})(AccountView);
