import { WorkspaceLogResponse } from '@internxt/sdk/dist/workspaces';
import { useState, useEffect, useCallback } from 'react';

const ITEMS_PER_PAGE = 20;

export const useAccessLogs = ({ searchMembersInputValue, fromCalendarValue, toCalendarValue, selectedPlatform }) => {
  const [filteredData, setFilteredData] = useState<WorkspaceLogResponse[]>([]);
  const [visibleData, setVisibleData] = useState<WorkspaceLogResponse[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const filterData = useCallback(() => {
    let result = visibleData;

    if (searchMembersInputValue) {
      result = result.filter(
        (item) =>
          item.user.name.toLowerCase().includes(searchMembersInputValue.toLowerCase()) ||
          item.user.email.toLowerCase().includes(searchMembersInputValue.toLowerCase()),
      );
    }

    if (fromCalendarValue) {
      result = result.filter((item) => new Date(item.createdAt) >= fromCalendarValue);
    }
    if (toCalendarValue) {
      result = result.filter((item) => new Date(item.createdAt) <= toCalendarValue);
    }

    if (selectedPlatform) {
      result = result.filter((item) => item.platform === selectedPlatform);
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
