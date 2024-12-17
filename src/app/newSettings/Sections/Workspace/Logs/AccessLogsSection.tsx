import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Section from '../../../../newSettings/components/Section';
import { useState } from 'react';
import { ScrollableTable, SetLastItemRef } from 'app/shared/tables/ScrollableTable';
import 'react-calendar/dist/Calendar.css';
import { TableCell, TableRow } from '@internxt/internxtui';
import { AccessLogsFilterOptions } from './components/AccessLogsFilterOptions';
import { useAccessLogs } from './hooks/useAccessLogs';
import { WorkspaceLogResponse, WorkspaceLogType } from '@internxt/sdk/dist/workspaces';
import dateService from 'app/core/services/date.service';
import { useDebounce } from 'hooks/useDebounce';

interface LogsViewProps {
  onClosePreferences: () => void;
}

export const AccessLogsSection = ({ onClosePreferences }: LogsViewProps): JSX.Element => {
  const { translate, translateList } = useTranslationContext();
  const [searchMembersInputValue, setSearchMembersInputValue] = useState<string>('');
  const [daysFilter, setDaysFilter] = useState<number | undefined>();
  const [activityFilter, setActivityFilter] = useState<WorkspaceLogType[]>([]);
  const debouncedSearchMemberValue = useDebounce(searchMembersInputValue, 500);
  const { logs, workspaceLogTypes, isLoading, hasMoreItems, loadMoreItems } = useAccessLogs({
    activity: activityFilter,
    lastDays: daysFilter,
    member: debouncedSearchMemberValue,
  });

  const headerList = translateList('preferences.workspace.accessLogs.headerTable');

  function getActivityDetails(type: WorkspaceLogType) {
    return translate(`preferences.workspace.accessLogs.filterActions.activity.${type}`) || 'Unknown action';
  }

  const handleActivityFilters = (actionType: WorkspaceLogType) => {
    const isFilterActivated = activityFilter?.some((activity) => activity === actionType);
    const newActivityFilters = isFilterActivated
      ? activityFilter.filter((activity) => activity !== actionType)
      : [...activityFilter, actionType];

    setActivityFilter(newActivityFilters);
  };

  const handleDaysFilter = (days: number) => {
    setDaysFilter(days);
  };

  const onClearAllFilters = () => {
    setSearchMembersInputValue('');
    setDaysFilter(undefined);
    setActivityFilter([]);
  };

  const formatDate = (createdAt: Date) => {
    const formatted = dateService.format(createdAt, 'MMM D, YYYY');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatTime = (createdAt: Date) => dateService.format(createdAt, 'hh:mm A');

  const renderHeader = (headers: string[]) => (
    <TableRow>
      {headers.map((header, index) => (
        <TableCell key={header} isHeader className="py-3 text-left font-medium">
          <div className="flex h-full flex-row justify-between pl-4">
            {header}
            {index === headers.length - 1 ? undefined : <div className="border border-gray-10" />}
          </div>
        </TableCell>
      ))}
    </TableRow>
  );

  const renderBody = (logs: WorkspaceLogResponse[], setLastItemRef: SetLastItemRef) => (
    <>
      {logs.map((item, index) => (
        <TableRow key={item.id} className="border-b border-gray-10 text-sm last:border-none hover:bg-gray-5">
          <TableCell
            style={{
              width: '30%',
            }}
            className="py-2 pl-4"
          >
            <div ref={index === logs.length - 1 ? setLastItemRef : null} className="flex flex-col gap-1">
              <p className="font-medium">{formatDate(item.createdAt)}</p>
              <p className="text-gray-50">{formatTime(item.createdAt)}</p>
            </div>
          </TableCell>
          <TableCell
            style={{
              width: '30%',
            }}
            className="py-2 pl-4"
          >
            <div>
              {item.user.name} {item.user.lastname}
            </div>
            <div className="text-sm text-gray-50">{item.user.email}</div>
          </TableCell>
          <TableCell
            style={{
              width: '20%',
            }}
            className="py-2 pl-4"
          >
            <div className="flex flex-col gap-1 truncate">
              <p className={'font-medium'}>{getActivityDetails(item.type)}</p>
              {item.file && <p className="text-gray-50">{item.file?.plainName}</p>}
            </div>
          </TableCell>
          <TableCell
            style={{
              width: '20%',
            }}
            className="py-2 pl-4"
          >
            {translate(`preferences.workspace.accessLogs.filterActions.platform.${item.platform}`)}
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Section title={translate('preferences.navBarSections.logs')} onClosePreferences={onClosePreferences}>
      <div className="flex h-screen w-full flex-col gap-6 overflow-hidden">
        <AccessLogsFilterOptions
          searchMembersInputValue={searchMembersInputValue}
          workspaceLogTypes={workspaceLogTypes}
          selectedFilters={{
            activity: activityFilter,
            days: daysFilter,
          }}
          handleDaysFilter={handleDaysFilter}
          onClearAllFilters={onClearAllFilters}
          onChangeActivityFilters={handleActivityFilters}
          onSearchMembersInputValueChange={setSearchMembersInputValue}
          translate={translate}
        />
        {logs.length > 0 ? (
          <ScrollableTable
            tableHeaderClassName="sticky top-0 z-10 border-b border-gray-10 bg-gray-5 font-semibold text-gray-100"
            tableClassName="min-w-full rounded-lg border border-gray-10"
            tableBodyClassName="bg-surface dark:bg-gray-1"
            renderHeader={() => renderHeader(headerList)}
            renderBody={(item) => renderBody(logs, item)}
            numOfColumnsForSkeleton={headerList.length ?? 4}
            scrollable
            loadMoreItems={() => {}}
            hasMoreItems={hasMoreItems}
            isLoading={isLoading}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <p>There are not results</p>
          </div>
        )}
      </div>
    </Section>
  );
};
