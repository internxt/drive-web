import { useState } from 'react';
import AccountTab from './tabs/Account';
import BillingTab from './tabs/Billing';
import SecurityTab from './tabs/Security';

type AccountTabID = 'account' | 'billing' | 'plans' | 'security';

export default function Preferences(): JSX.Element {
  const TABS: {
    id: AccountTabID;
    label: string;
    component: React.FunctionComponent<{ className?: string }> | null;
  }[] = [
    { id: 'account', label: 'Account', component: AccountTab },
    { id: 'billing', label: 'Billing', component: BillingTab },
    { id: 'plans', label: 'Plans', component: null },
    { id: 'security', label: 'Security', component: SecurityTab },
  ];

  const [activeTab, setActiveTab] = useState<AccountTabID>('account');

  return (
    <div className="flex h-full w-full flex-col">
      <TabSelector tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      {/* overflow-y-auto and overflow-x-visible is not a valid combination in the same element */}
      <div className="flex-grow overflow-y-auto">
        <div className="overflow-x-visible" style={{ maxWidth: '872px' }}>
          {TABS.map(
            ({ component: Component, id }) =>
              Component && <Component className={`p-8 ${activeTab !== id ? 'hidden' : ''}`} key={id} />,
          )}
        </div>
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
