import { WorkspaceLogOrderBy, WorkspaceLogResponse, WorkspaceLogType } from '@internxt/sdk/dist/workspaces';
import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { useState, useEffect } from 'react';

export const ACCESS_LOGS_DEFAULT_LIMIT = 20;

interface UseAccessLogsProps {
  lastDays?: number;
  member?: string;
  activity?: WorkspaceLogType[];
  orderBy?: string;
}

export const useAccessLogs = ({ activity, lastDays, member, orderBy }: UseAccessLogsProps) => {
  const selectedWorkspace = useAppSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const workspaceId = selectedWorkspace?.workspace?.id;

  const [accessLogs, setAccessLogs] = useState<WorkspaceLogResponse[]>([]);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    resetStates();
    fetchWorkspaceLogs(true);
  }, [workspaceId, activity, lastDays, member, orderBy]);

  const fetchWorkspaceLogs = async (reset = false) => {
    if (isLoading || !workspaceId) return;

    setIsLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      const workspaceLogs = await workspacesService.getWorkspaceLogs({
        workspaceId,
        limit: ACCESS_LOGS_DEFAULT_LIMIT,
        offset: currentOffset,
        activity,
        lastDays,
        member,
        orderBy: orderBy as WorkspaceLogOrderBy,
      });

      setAccessLogs((prevItems) => (reset ? workspaceLogs : [...prevItems, ...workspaceLogs]));
      setOffset((prevOffset) => (reset ? ACCESS_LOGS_DEFAULT_LIMIT : prevOffset + ACCESS_LOGS_DEFAULT_LIMIT));
      setHasMoreItems(workspaceLogs.length >= ACCESS_LOGS_DEFAULT_LIMIT);
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreItems = () => {
    if (!isLoading && hasMoreItems) {
      fetchWorkspaceLogs();
    }
  };

  const resetStates = () => {
    setAccessLogs([]);
    setOffset(0);
    setHasMoreItems(true);
  };

  return {
    accessLogs,
    isLoading,
    hasMoreItems,
    loadMoreItems,
  };
};
