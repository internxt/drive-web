import { WorkspaceLogResponse, WorkspaceLogType } from '@internxt/sdk/dist/workspaces';
import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import _ from 'lodash';
import { useState, useEffect, useCallback } from 'react';

const DEFAULT_LIMIT = 10;

interface UseAccessLogsProps {
  lastDays?: number;
  member?: string;
  activity?: WorkspaceLogType[];
}

export const useAccessLogs = ({ activity, lastDays, member }: UseAccessLogsProps) => {
  const selectedWorkspace = useAppSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const workspaceId = selectedWorkspace?.workspace?.id;
  const [logs, setLogs] = useState<WorkspaceLogResponse[]>([]);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(false);
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

  const fetchWorkspaceLogs = useCallback(
    async (reset = false) => {
      if (isLoading) return;
      try {
        setIsLoading(true);
        const currentOffset = reset ? 0 : offset;
        if (selectedWorkspace?.workspace.id && workspaceId) {
          const workspaceLogs = await workspacesService.getWorkspaceLogs({
            workspaceId,
            limit: DEFAULT_LIMIT,
            offset: currentOffset,
            activity,
            lastDays,
            member,
          });

          setLogs((prevItems) => {
            const totalItems = _.concat(prevItems, workspaceLogs);
            return totalItems;
          });

          const thereAreMoreItems = workspaceLogs.length >= DEFAULT_LIMIT;
          if (thereAreMoreItems) {
            setOffset((prevOffset) => prevOffset + DEFAULT_LIMIT);
            setHasMoreItems(true);
          } else {
            setHasMoreItems(false);
          }
        }
      } catch (error) {
        errorService.reportError(error);
        setHasMoreItems(false);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, offset, activity, lastDays, member],
  );

  const loadMoreItems = useCallback(async () => {
    if (isLoading || !hasMoreItems) return;

    await fetchWorkspaceLogs();
  }, [isLoading, hasMoreItems, fetchWorkspaceLogs]);

  return {
    logs,
    workspaceLogTypes,
    isLoading,
    hasMoreItems,
    loadMoreItems,
  };
};
