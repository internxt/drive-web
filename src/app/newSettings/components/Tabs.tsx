import { TabsProps } from '../types';

const Tabs = ({ tabs, activeTab, setActiveTab }: TabsProps) => {
  return (
    <section className="!mt-8">
      <div className="flex h-10 w-fit rounded-xl bg-gray-5 p-1">
        {tabs.map((tab) => {
          return (
            <button
              className={`h-8 rounded-lg bg-gray-5 px-6 text-base font-medium capitalize text-gray-50 ${
                activeTab.title === tab.title && 'bg-surface !text-gray-100 dark:bg-gray-30'
              }`}
              onClick={() => setActiveTab(tab)}
              key={tab.title}
            >
              {tab.title}
            </button>
          );
        })}
      </div>
      <div className="mt-8">{activeTab.view}</div>
    </section>
  );
};

export default Tabs;
