import { WorkspaceLogResponse, WorkspaceLogType } from '@internxt/sdk/dist/workspaces';
import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { useState, useEffect } from 'react';

const DEFAULT_LIMIT = 10;

interface UseAccessLogsProps {
  lastDays?: number;
  member?: string;
  activity?: WorkspaceLogType[];
}

export const useAccessLogs = ({ activity, lastDays, member }: UseAccessLogsProps) => {
  const selectedWorkspace = useAppSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const workspaceId = selectedWorkspace?.workspace?.id;

  const [accessLogs, setAccessLogs] = useState<WorkspaceLogResponse[]>([]);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceLogTypes, setWorkspaceLogTypes] = useState<WorkspaceLogType[]>();

  useEffect(() => {
    getWorkspaceLogTypes();
  }, []);

  useEffect(() => {
    fetchWorkspaceLogs(true);
  }, [workspaceId, activity, lastDays, member]);

  const getWorkspaceLogTypes = async () => {
    try {
      const workspaceLogTypes = workspacesService.getWorkspaceLogsTypes();
      setWorkspaceLogTypes(workspaceLogTypes);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const fetchWorkspaceLogs = async (reset = false) => {
    if (isLoading || !workspaceId) return;

    setIsLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      const workspaceLogs = await workspacesService.getWorkspaceLogs({
        workspaceId,
        limit: DEFAULT_LIMIT,
        offset: currentOffset,
        activity,
        lastDays,
        member,
      });

      setAccessLogs((prevItems) => (reset ? workspaceLogs : [...prevItems, ...workspaceLogs]));
      setOffset((prevOffset) => (reset ? DEFAULT_LIMIT : prevOffset + DEFAULT_LIMIT));
      setHasMoreItems(workspaceLogs.length >= DEFAULT_LIMIT);
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

  return {
    accessLogs,
    workspaceLogTypes,
    isLoading,
    hasMoreItems,
    loadMoreItems,
  };
};
