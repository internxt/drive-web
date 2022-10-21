import { FC } from 'react';

const PREFERENCES_TABS = ['drive', 'photosGallery'] as const;
export type PreferencesTabID = typeof PREFERENCES_TABS[number];

type TabSelectorProps = {
  tabs: { id: PreferencesTabID; label: string }[];
  activeTab: PreferencesTabID;
  onChange: (newActiveTab: PreferencesTabID) => void;
};
const TabSelector: FC<TabSelectorProps> = ({ activeTab, onChange, tabs }) => {
  return (
    <div className="flex px-5 pt-2 pb-2">
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
};

export { TabSelector };
