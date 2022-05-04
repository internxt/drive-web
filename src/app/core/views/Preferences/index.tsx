import { useState } from 'react';
import AccountTab from './tabs/Account';

type AccountTabID = 'account' | 'billing' | 'plans' | 'security';

export default function Preferences(): JSX.Element {
  const TABS: { id: AccountTabID; label: string; component: React.FunctionComponent<{ isHidden: boolean }> | null }[] =
    [
      { id: 'account', label: 'Account', component: AccountTab },
      { id: 'billing', label: 'Billing', component: null },
      { id: 'plans', label: 'Plans', component: null },
      { id: 'security', label: 'Security', component: null },
    ];

  const [activeTab, setActiveTab] = useState<AccountTabID>('account');

  return (
    <div className="h-full w-full">
      <TabSelector tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      <div className="p-8" style={{ maxWidth: '872px' }}>
        {TABS.map(({ component: Component, id }) => Component && <Component isHidden={activeTab !== id} />)}
      </div>
    </div>
  );
}

function TabSelector({
  activeTab,
  onChange,
  tabs,
}: {
  tabs: { id: AccountTabID; label: string }[];
  activeTab: AccountTabID;
  onChange: (newActiveTab: AccountTabID) => void;
}): JSX.Element {
  return (
    <div className="px-8 pt-5">
      <div className="flex space-x-5 border-b border-gray-5 px-2">
        {tabs.map((tab) => (
          <button
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
