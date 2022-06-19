import { createContext, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import AccountTab from './tabs/Account';
import BillingTab from './tabs/Billing';
import PlansTab from './tabs/Plans';
import SecurityTab from './tabs/Security';

const PREFERENCES_TABS = ['account', 'billing', 'plans', 'security'] as const;
type PreferencesTabID = typeof PREFERENCES_TABS[number];

export const TabContext = createContext<{
  activeTab: PreferencesTabID;
  setActiveTab: (value: PreferencesTabID) => void;
}>({ activeTab: 'account', setActiveTab: () => undefined });

export default function Preferences(): JSX.Element {
  const TABS: {
    id: PreferencesTabID;
    label: string;
    component: React.FunctionComponent<{ className?: string }>;
  }[] = [
    { id: 'account', label: 'Account', component: AccountTab },
    { id: 'billing', label: 'Billing', component: BillingTab },
    { id: 'plans', label: 'Plans', component: PlansTab },
    { id: 'security', label: 'Security', component: SecurityTab },
  ];

  const [activeTab, setActiveTab] = useState<PreferencesTabID>('account');

  const history = useHistory();

  function updateUrlWithState() {
    history.replace({ search: new URLSearchParams({ tab: activeTab }).toString() });
  }

  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    updateUrlWithState();
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    if (tab && PREFERENCES_TABS.includes(tab as PreferencesTabID)) {
      setActiveTab(tab as PreferencesTabID);
    } else if (!tab) {
      updateUrlWithState();
    }
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <TabSelector tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      <TabContext.Provider value={{ activeTab, setActiveTab }}>
        {/* overflow-y-auto and overflow-x-visible is not a valid combination in the same element */}
        <div className="flex-grow overflow-y-auto">
          <div className="overflow-x-visible" style={{ maxWidth: '872px' }}>
            {TABS.map(
              ({ component: Component, id }) =>
                Component && <Component className={`p-8 ${activeTab !== id ? 'hidden' : ''}`} key={id} />,
            )}
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
      <div className="flex space-x-5 border-b border-gray-5 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex h-10 items-center border-b-2 px-2 font-medium ${
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
