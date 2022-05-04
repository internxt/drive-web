import { useState } from 'react';

const TABS: { id: AccountTabID; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'billing', label: 'Billing' },
  { id: 'plans', label: 'Plans' },
  { id: 'security', label: 'Security' },
];

type AccountTabID = 'account' | 'billing' | 'plans' | 'security';

export default function AccountView(): JSX.Element {
  const [activeTab, setActiveTab] = useState<AccountTabID>('account');

  return (
    <div className="h-full w-full">
      <TabSelector tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
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
