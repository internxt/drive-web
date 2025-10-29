import { useState } from 'react';
import { t } from 'i18next';
import { ActivityTabProps } from '../../../../types/types';

import EmptyTab from 'app/newSettings/components/EmptyTab';

import membersActivity from 'assets/icons/empty/members-activity.svg';
import ActivityFilters from './ActivityFilters';

const ActivityTab = ({ role, isActivityEnabled, activity }: ActivityTabProps): JSX.Element => {
  const isOwner = role === 'owner';
  const [isSelectedRoles, setIsSelectedRoles] = useState<string[]>(['member', 'manager', 'owner']);

  const enableActivity = () => {};

  return (
    <>
      {!isActivityEnabled && isOwner && (
        <EmptyTab
          icon={membersActivity}
          title={t('preferences.workspace.members.tabs.activity.disabilitedOwner.title')}
          subtitle={t('preferences.workspace.members.tabs.activity.disabilitedOwner.subtitle')}
          action={{
            text: t('preferences.workspace.members.tabs.activity.disabilitedOwner.action'),
            onClick: enableActivity,
          }}
        />
      )}

      {!isActivityEnabled && !isOwner && (
        <EmptyTab
          icon={membersActivity}
          title={t('preferences.workspace.members.tabs.activity.disabilitedMember.title')}
          subtitle={t('preferences.workspace.members.tabs.activity.disabilitedMember.subtitle')}
        />
      )}

      {isActivityEnabled && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xl font-medium text-gray-100">
              {t('preferences.workspace.members.tabs.activity.name')}
            </h3>
            <ActivityFilters isSelectedRoles={isSelectedRoles} setIsSelectedRoles={setIsSelectedRoles} />
          </div>
          <div className="flex h-full w-full flex-col rounded-xl border border-gray-10 p-6 shadow-sm">
            {activity.map((day) => {
              const records = day.records;
              const lastRecord = records.slice(-1);

              return (
                <div key={day.date}>
                  <p className="mb-px w-fit rounded-md bg-gray-5 px-3 py-1.5 text-sm font-medium text-gray-100">
                    {day.date}
                  </p>
                  {records.length > 0 ? (
                    records.map((record) => {
                      return (
                        <div
                          key={record.description}
                          className={`flex justify-between py-3 ${
                            lastRecord[0]?.title !== record.title && 'border-b border-gray-10'
                          }`}
                        >
                          <div>
                            <p className="font-regular mb-0.5 text-base text-gray-100">{record.title}</p>
                            <p className="font-regular text-sm text-gray-60">{record.description}</p>
                          </div>
                          <p className="font-regular text-base text-gray-50">{record.time}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="font-regular mb-2.5 pb-6 pt-3 text-base text-gray-40">
                      {t('preferences.workspace.members.tabs.activity.empty')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
};

export default ActivityTab;
