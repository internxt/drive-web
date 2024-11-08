import { useState, useEffect, useCallback } from 'react';

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

export const useAccessLogs = ({ searchMembersInputValue, fromCalendarValue, toCalendarValue, selectedPlatform }) => {
  const [filteredData, setFilteredData] = useState<ActivityRow[]>([]);
  const [visibleData, setVisibleData] = useState<ActivityRow[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const mockTableData = generateMockData();

  const filterData = useCallback(() => {
    let result = mockTableData;

    if (searchMembersInputValue) {
      result = result.filter(
        (item) =>
          item.member.name.toLowerCase().includes(searchMembersInputValue.toLowerCase()) ||
          item.member.email.toLowerCase().includes(searchMembersInputValue.toLowerCase()),
      );
    }

    if (fromCalendarValue) {
      result = result.filter((item) => new Date(item.date) >= fromCalendarValue);
    }
    if (toCalendarValue) {
      result = result.filter((item) => new Date(item.date) <= toCalendarValue);
    }

    if (selectedPlatform) {
      result = result.filter((item) => item.access === selectedPlatform);
    }

    setFilteredData(result);
    setVisibleData(result.slice(0, ITEMS_PER_PAGE));
    setPage(1);
  }, [searchMembersInputValue, fromCalendarValue, toCalendarValue, selectedPlatform]);

  const loadMoreItems = useCallback(() => {
    if (isLoading || visibleData.length >= filteredData.length) return;

    setIsLoading(true);
    setTimeout(() => {
      const nextPageData = filteredData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
      setVisibleData((prevData) => [...prevData, ...nextPageData]);
      setPage((prevPage) => prevPage + 1);
      setIsLoading(false);
    }, 500);
  }, [isLoading, page, filteredData, visibleData]);

  useEffect(() => {
    filterData();
  }, [filterData]);

  const hasMoreItems = visibleData.length < filteredData.length;

  return {
    visibleData,
    isLoading,
    hasMoreItems,
    loadMoreItems,
  };
};
