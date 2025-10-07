import { useEffect, useState } from 'react';

interface UsePaginationStateProps {
  isTrash: boolean;
  hasMoreFiles: boolean;
  hasMoreFolders: boolean;
}

export const usePaginationState = ({ isTrash, hasMoreFiles, hasMoreFolders }: UsePaginationStateProps) => {
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);

  const hasMoreItemsToLoad = isTrash ? hasMoreItems : hasMoreFiles || hasMoreFolders;
  const isEmptyFolder = hasMoreItemsToLoad;

  useEffect(() => {
    if (!isTrash && !hasMoreFiles) {
      setHasMoreItems(false);
    }
  }, [hasMoreFiles, isTrash]);

  useEffect(() => {
    if (hasMoreFiles && hasMoreFolders) {
      setHasMoreItems(true);
    }
  }, [hasMoreFiles, hasMoreFolders]);

  const resetPaginationState = () => {
    setHasMoreItems(true);
  };

  return {
    hasMoreItems,
    hasMoreItemsToLoad,
    isEmptyFolder,
    setHasMoreItems,
    resetPaginationState,
  };
};
