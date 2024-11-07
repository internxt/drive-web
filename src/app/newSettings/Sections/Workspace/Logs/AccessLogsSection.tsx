import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Section from '../../../../newSettings/components/Section';
import { useCallback, useState } from 'react';
import { ScrollableTable } from 'app/shared/tables/ScrollableTable';

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

  const accessTypes = ['Web', 'Mobile'];

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
  const { translate } = useTranslationContext();
  const [visibleData, setVisibleData] = useState(mockTableData.slice(0, ITEMS_PER_PAGE));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const headers = [
    {
      label: 'Date',
    },
    {
      label: 'Name',
    },
    {
      label: 'Activity',
    },
    {
      label: 'Platform',
    },
  ];

  const loadMoreItems = useCallback(() => {
    if (loading) return;

    setLoading(true);
    setTimeout(() => {
      const nextData = mockTableData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
      setVisibleData((prevData) => [...prevData, ...nextData]);
      setPage((prevPage) => prevPage + 1);
      setLoading(false);
    }, 500);
  }, [loading, page]);

  return (
    <Section title={translate('preferences.navBarSections.logs')} onClosePreferences={onClosePreferences}>
      <ScrollableTable
        headers={headers}
        data={visibleData}
        scrollable
        loadMoreItems={loadMoreItems}
        hasMoreItems={page * ITEMS_PER_PAGE < mockTableData.length}
        loading={loading}
      />
    </Section>
  );
};
