import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { createContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AccountTab from './tabs/Account';
import BillingTab from './tabs/Billing';
import PlansTab from './tabs/Plans';
import SecurityTab from './tabs/Security';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';

const PREFERENCES_TABS = ['account', 'billing', 'plans', 'security'] as const;
type PreferencesTabID = (typeof PREFERENCES_TABS)[number];

export const TabContext = createContext<{
  activeTab: PreferencesTabID;
  setActiveTab: (value: PreferencesTabID) => void;
}>({ activeTab: 'account', setActiveTab: () => undefined });

export default function Preferences(): JSX.Element {
  const { translate } = useTranslationContext();
  const TABS: {
    id: PreferencesTabID;
    label: string;
    component: React.FunctionComponent<{ className?: string }>;
  }[] = [
    { id: 'account', label: translate('views.account.tabs.account.label'), component: AccountTab },
    { id: 'billing', label: translate('views.account.tabs.billing.label'), component: BillingTab },
    { id: 'plans', label: translate('views.account.tabs.plans.label'), component: PlansTab },
    { id: 'security', label: translate('views.account.tabs.security.label'), component: SecurityTab },
  ];
  const params = new URLSearchParams(window.location.search);
  const urlTab = params.get('tab');
  const [activeTab, setActiveTab] = useState<PreferencesTabID>('account');
  const [currentTabTitle, setCurrentTabTitle] = useState<string>('account');

  useEffect(() => {
    if (urlTab) {
      const currentTab = TABS.filter((tab) => tab.id === urlTab);
      setActiveTab(urlTab as PreferencesTabID);
      setCurrentTabTitle(currentTab[0].label);
    } else {
      navigationService.history.replace({ search: new URLSearchParams({ tab: activeTab }).toString() });
    }
  }, [urlTab]);

  const navigateTab = (tabId) => {
    navigationService.push(AppView.Preferences, { tab: `${tabId}` });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <Helmet>
        <title>{currentTabTitle} - Internxt Drive</title>
      </Helmet>
      <TabSelector tabs={TABS} activeTab={activeTab} onChange={navigateTab} />
      <TabContext.Provider value={{ activeTab, setActiveTab }}>
        <div className="flex grow flex-row justify-center overflow-y-auto p-8">
          <div className="w-screen max-w-screen-xl overflow-x-visible">
            {TABS.map(
              ({ component: Component, id }) =>
                Component && <Component className={`${activeTab !== id ? 'hidden' : ''}`} key={id} />,
            )}
            <div className="h-8" />
          </div>
        </div>
      </TabContext.Provider>
    </div>
  );
}

function TabSelector({
  activeTab,
  onChange,
  tabs,
}: {
  tabs: { id: PreferencesTabID; label: string }[];
  activeTab: PreferencesTabID;
  onChange: (newActiveTab: PreferencesTabID) => void;
}): JSX.Element {
  return (
    <div className="px-8 pt-5">
      <div className="flex space-x-8 border-b border-gray-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex h-10 items-center border-b-2 font-medium ${
              tab.id === activeTab
                ? 'border-primary text-primary'
                : 'cursor-pointer border-transparent text-gray-60 hover:text-gray-70'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
