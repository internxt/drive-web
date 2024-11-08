import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Section from '../../../../newSettings/components/Section';
import { useState } from 'react';
import { ScrollableTable } from 'app/shared/tables/ScrollableTable';
import 'react-calendar/dist/Calendar.css';
import { TableCell, TableRow } from '@internxt/internxtui';
import { AccessLogsFilterOptions } from './components/AccessLogsFilterOptions';
import { useAccessLogs } from './hooks/useAccessLogs';

interface LogsView {
  onClosePreferences: () => void;
}

interface ActivityRow {
  id: string;
  date: string;
  time: string;
  member: {
    name: string;
    email: string;
  };
  activity: { action: string; color: string };
  access: string;
}

const ITEMS_PER_PAGE = 20;

function generateMockData(numItems = 100): ActivityRow[] {
  const members = [
    { name: 'Daniel Dun', email: 'daniel@internxt.com' },
    { name: 'Steven S', email: 'stevens@internxt.com' },
    { name: 'Lewis L', email: 'lewis@internxt.com' },
    { name: 'Alice A', email: 'alice@internxt.com' },
    { name: 'Bob B', email: 'bob@internxt.com' },
    { name: 'Charlie C', email: 'charlie@internxt.com' },
  ];

  const activities = [
    { action: 'Signed in', color: 'text-green' },
    { action: 'Signed out', color: 'text-gray' },
    { action: 'Changed', color: 'text-orange' },
  ];

  const accessTypes = ['Web', 'Desktop', 'Mobile'];

  const mockData: ActivityRow[] = [];

  for (let i = 0; i < numItems; i++) {
    const randomMember = members[Math.floor(Math.random() * members.length)];
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    const randomAccess = accessTypes[Math.floor(Math.random() * accessTypes.length)];

    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 365));
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });

    mockData.push({
      id: `${i}`,
      date: formattedDate,
      time: formattedTime,
      member: {
        name: randomMember.name,
        email: randomMember.email,
      },
      activity: {
        action: randomActivity.action,
        color: randomActivity.color,
      },
      access: randomAccess,
    });
  }

  return mockData;
}

const mockTableData = generateMockData();

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

  const headers = translateList('preferences.workspace.accessLogs.headerTable');

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
        {visibleData.length > 0 ? (
          <ScrollableTable
            renderHeader={() => (
              <TableRow>
                {headers.map((header, index) => (
                  <TableCell key={header} isHeader className="py-2 text-left font-medium">
                    <div className="flex h-full flex-row justify-between py-2 pl-4">
                      {header}
                      {index === headers.length - 1 ? undefined : <div className="border border-gray-10" />}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            )}
            renderBody={() => (
              <>
                {visibleData.map((item) => (
                  <TableRow className="border-b border-gray-10 text-sm last:border-none hover:bg-gray-5" key={item.id}>
                    <TableCell className="py-2 pl-4">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">{item.date}</p>
                        <p className="text-gay-10">{item.time}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 pl-4">
                      <div>{item.member.name}</div>
                      <div className="text-sm text-gray-50">{item.member.email}</div>
                    </TableCell>
                    <TableCell className="py-2 pl-4">
                      <span className={`${item.activity.color} font-medium`}>{item.activity.action}</span>
                    </TableCell>
                    <TableCell className="py-2 pl-4">{item.access}</TableCell>
                  </TableRow>
                ))}
              </>
            )}
            tableClassName="min-w-full rounded-lg border border-gray-10"
            tableHeaderClassName="sticky top-0 z-10 border-b border-gray-10 bg-gray-5 font-semibold text-gray-100"
            tableBodyClassName="bg-none"
            numOfColumnsForSkeleton={headers.length ?? 4}
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
