import { TabsProps } from '../types/types';

const Tabs = ({ tabs, activeTab, setActiveTab }: TabsProps) => {
  return (
    <section className="!mt-8">
      <div className="flex h-10 w-fit rounded-xl bg-gray-5 p-1">
        {tabs.map((tab) => {
          return (
            <button
              className={`h-8 rounded-lg bg-gray-5 px-6 text-base font-medium text-gray-50 ${
                activeTab.tab === tab.tab && 'bg-surface !text-gray-100 dark:bg-gray-30'
              }`}
              onClick={() => setActiveTab(tab)}
              key={tab.tab}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
      <div className="mt-8">{activeTab.view}</div>
    </section>
  );
};

export default Tabs;
