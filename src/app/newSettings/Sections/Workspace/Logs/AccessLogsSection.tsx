import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Section from '../../../../newSettings/components/Section';
import { useEffect, useState } from 'react';
import { ScrollableTable } from 'app/shared/tables/ScrollableTable';
import 'react-calendar/dist/Calendar.css';
import { TableCell, TableRow } from '@internxt/internxtui';
import { AccessLogsFilterOptions } from './components/AccessLogsFilterOptions';
import { useAccessLogs } from './hooks/useAccessLogs';
import { WorkspaceLogResponse, WorkspaceLogOrderBy, WorkspaceLogType } from '@internxt/sdk/dist/workspaces';
import dateService from 'app/core/services/date.service';
import { useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';

interface LogsView {
  onClosePreferences: () => void;
}

const activities = {
  [WorkspaceLogType.LOGIN]: { displayAction: 'Signed in', color: 'text-green' },
  [WorkspaceLogType.LOGOUT]: { displayAction: 'Signed out', color: 'text-gray' },
  [WorkspaceLogType.CHANGED_PASSWORD]: { displayAction: 'Changed Password', color: 'text-orange' },
  [WorkspaceLogType.SHARE_FILE]: { displayAction: 'Share File', color: 'text-green' },
  [WorkspaceLogType.SHARE_FOLDER]: { displayAction: 'Share Folder', color: 'text-green' },
  [WorkspaceLogType.DELETE_FILE]: { displayAction: 'Delete File', color: 'text-red' },
  [WorkspaceLogType.DELETE_FOLDER]: { displayAction: 'Delete Folder', color: 'text-red' },
};

export const AccessLogsSection = ({ onClosePreferences }: LogsView): JSX.Element => {
  const { translate, translateList } = useTranslationContext();
  const [searchMembersInputValue, setSearchMembersInputValue] = useState<string>('');
  const [fromCalendarValue, setFromCalendarValue] = useState<Date | null>(null);
  const [toCalendarValue, setToCalendarValue] = useState<Date | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const { visibleData, isLoading, hasMoreItems, loadMoreItems } = useAccessLogs({
    fromCalendarValue: fromCalendarValue,
    searchMembersInputValue: searchMembersInputValue,
    selectedPlatform: selectedPlatform,
    toCalendarValue: toCalendarValue,
  });
  const selectedWorkspace = useAppSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const workspaceId = selectedWorkspace?.workspace?.id;
  const [logs, setLogs] = useState<WorkspaceLogResponse[]>([]);
  const [displayedLogs, setDisplayedLogs] = useState<WorkspaceLogResponse[]>(logs);

  useEffect(() => {
    if (selectedWorkspace?.workspace.id && workspaceId) {
      const mockLimit = 10;
      const mockOffset = 0;
      const mockMember = 'eder-test@shok.com'; // undefined; // user.name o email
      const mockActivities = [WorkspaceLogType.SHARE_FILE, WorkspaceLogType.SHARE_FOLDER, WorkspaceLogType.DELETE_FILE]; // Array Empty or undefined === return all types
      const mockLastDays = 30; // Undefined === All
      const mockOrderBy: WorkspaceLogOrderBy = 'type:DESC'; // Undefined === Default: createdAt:DESC
      workspacesService
        .getWorkspaceLogs(workspaceId, mockLimit, mockOffset, mockMember, mockActivities, mockLastDays, mockOrderBy)
        .then((data) => {
          setLogs(data);
          setDisplayedLogs(data);
        })
        .catch((err) => {
          const error = errorService.castError(err);
          errorService.reportError(error);
        });
    }
  }, []);

  useEffect(() => {
    if (logs && logs.length > 0) {
      const newLogs = filterLogsByMemberAndEmail(searchMembersInputValue);
      setDisplayedLogs(newLogs || []);
    }
  }, [searchMembersInputValue]);

  const headerList = translateList('preferences.workspace.accessLogs.headerTable');

  function getActivityDetails(type: WorkspaceLogType) {
    return activities[type] || { displayAction: 'Unknown action', color: 'text-default' };
  }

  const formatDate = (createdAt: Date) => {
    const formatted = dateService.format(createdAt, 'MMM D, YYYY');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatTime = (createdAt: Date) => dateService.format(createdAt, 'hh:mm A');

  const filterLogsByMemberAndEmail = (searchString: string) => {
    const escapedSearchString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearchString, 'i');

    return logs?.filter((log) => regex.test(`${log.user.name} ${log.user.lastname}`) || regex.test(log.user.email));
  };

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

  const renderBody = (logs: WorkspaceLogResponse[]) => (
    <>
      {logs.map((item) => (
        <TableRow key={item.id} className="border-b border-gray-10 text-sm last:border-none hover:bg-gray-5">
          <TableCell
            style={{
              width: '30%',
            }}
            className="py-2 pl-4"
          >
            <div className="flex flex-col gap-1">
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
            <span className={`${getActivityDetails(item.type).color} font-medium`}>
              {getActivityDetails(item.type).displayAction}
            </span>
          </TableCell>
          <TableCell
            style={{
              width: '20%',
            }}
            className="py-2 pl-4"
          >
            {item.platform}
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
          onFromCalendarChange={setFromCalendarValue}
          onToCalendarChange={setToCalendarValue}
          onSearchMembersInputValueChange={setSearchMembersInputValue}
          onPlatformChange={setSelectedPlatform}
          fromDate={fromCalendarValue}
          toDate={toCalendarValue}
          translate={translate}
        />
        {displayedLogs.length > 0 ? (
          <ScrollableTable
            tableHeaderClassName="sticky top-0 z-10 border-b border-gray-10 bg-gray-5 font-semibold text-gray-100"
            tableClassName="min-w-full rounded-lg border border-gray-10"
            tableBodyClassName="bg-surface dark:bg-gray-1"
            renderHeader={() => renderHeader(headerList)}
            renderBody={() => renderBody(displayedLogs)}
            numOfColumnsForSkeleton={headerList.length ?? 4}
            scrollable
            loadMoreItems={loadMoreItems}
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
