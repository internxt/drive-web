import { DriveFileData, FolderChild } from '@internxt/sdk/dist/drive/storage/types';
import newStorageService from 'app/drive/services/new-storage.service';
import { useCallback, useEffect, useRef, useState } from 'react';
import errorService from 'services/error.service';

export interface GalleryDateGroup {
  id: string;
  label: string;
  photos: DriveFileData[];
}

interface MonthCursor {
  deviceUuid: string;
  year: string;
  month: string;
  monthFolderUuid: string;
}

const getDateLabel = (year: string, month: string, day: string): string => {
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');
  const dateStr = `${year}-${paddedMonth}-${paddedDay}`;
  const date = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const sortKey = (year: string, month: string): string => `${year.padStart(4, '0')}-${month.padStart(2, '0')}`;

const PAGE_LIMIT = 50;

async function fetchChildren(folderUuid: string): Promise<FolderChild[]> {
  const all: FolderChild[] = [];
  let offset = 0;
  let lastBatchSize: number;
  do {
    const [promise] = newStorageService.getFolderContentByUuid({ folderUuid, limit: PAGE_LIMIT, offset });
    const result = await promise;
    all.push(...result.children);
    lastBatchSize = result.children.length;
    offset += PAGE_LIMIT;
  } while (lastBatchSize === PAGE_LIMIT);
  return all;
}

async function fetchFiles(folderUuid: string): Promise<DriveFileData[]> {
  const all: DriveFileData[] = [];
  let offset = 0;
  let lastBatchSize: number;
  do {
    const [promise] = newStorageService.getFolderContentByUuid({ folderUuid, limit: PAGE_LIMIT, offset });
    const result = await promise;
    all.push(...result.files);
    lastBatchSize = result.files.length;
    offset += PAGE_LIMIT;
  } while (lastBatchSize === PAGE_LIMIT);
  return all;
}

async function fetchMonthGroups(cursor: MonthCursor): Promise<GalleryDateGroup[]> {
  const dayFolders = await fetchChildren(cursor.monthFolderUuid);

  const dayResults = await Promise.all(
    dayFolders.map(async (dayFolder) => {
      const day = dayFolder.plain_name || dayFolder.plainName || dayFolder.name;
      try {
        const files = await fetchFiles(dayFolder.uuid);
        return { day, files };
      } catch {
        return { day, files: [] as DriveFileData[] };
      }
    }),
  );

  const groups: GalleryDateGroup[] = [];
  for (const { day, files } of dayResults) {
    if (files.length === 0) continue;
    const id = `${cursor.year}-${cursor.month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    groups.push({
      id,
      label: getDateLabel(cursor.year, cursor.month, day),
      photos: files,
    });
  }

  return groups.sort((a, b) => b.id.localeCompare(a.id));
}

export function usePhotosGallery(selectedDeviceUuids: string[]) {
  const [groups, setGroups] = useState<GalleryDateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const cursorsRef = useRef<MonthCursor[]>([]);
  const cursorIdxRef = useRef(0);
  const isLoadingRef = useRef(false);
  const generationRef = useRef(0);

  const buildCursors = useCallback(async (deviceUuids: string[]) => {
    const generation = ++generationRef.current;
    // Cancel any in-flight loadMore from a previous selection
    isLoadingRef.current = false;

    if (deviceUuids.length === 0) {
      cursorsRef.current = [];
      cursorIdxRef.current = 0;
      setGroups([]);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setGroups([]);
    cursorsRef.current = [];
    cursorIdxRef.current = 0;

    try {
      const allCursors: MonthCursor[] = [];

      await Promise.all(
        deviceUuids.map(async (deviceUuid) => {
          try {
            const yearFolders = await fetchChildren(deviceUuid);
            await Promise.all(
              yearFolders.map(async (yearFolder) => {
                const year = yearFolder.plain_name || yearFolder.plainName || yearFolder.name;
                try {
                  const monthFolders = await fetchChildren(yearFolder.uuid);
                  for (const monthFolder of monthFolders) {
                    const month = monthFolder.plain_name || monthFolder.plainName || monthFolder.name;
                    allCursors.push({
                      deviceUuid,
                      year,
                      month,
                      monthFolderUuid: monthFolder.uuid,
                    });
                  }
                } catch {
                  // skip year if months can't be fetched
                }
              }),
            );
          } catch {
            // skip device if years can't be fetched
          }
        }),
      );

      if (generationRef.current !== generation) return;

      allCursors.sort((a, b) => sortKey(b.year, b.month).localeCompare(sortKey(a.year, a.month)));
      cursorsRef.current = allCursors;
      setHasMore(allCursors.length > 0);
    } catch (err) {
      if (generationRef.current === generation) errorService.reportError(err);
    } finally {
      if (generationRef.current === generation) setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current) return;
    const generation = generationRef.current;
    const cursors = cursorsRef.current;
    const idx = cursorIdxRef.current;
    if (idx >= cursors.length) {
      setHasMore(false);
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const cursor = cursors[idx];
      const newGroups = await fetchMonthGroups(cursor);

      if (generationRef.current !== generation) return;

      cursorIdxRef.current = idx + 1;

      setGroups((prev) => {
        const merged = [...prev];
        for (const newGroup of newGroups) {
          const existing = merged.find((g) => g.id === newGroup.id);
          if (existing) {
            existing.photos = [...existing.photos, ...newGroup.photos];
          } else {
            merged.push(newGroup);
          }
        }
        return merged.sort((a, b) => b.id.localeCompare(a.id));
      });

      setHasMore(cursorIdxRef.current < cursors.length);
    } catch (err) {
      if (generationRef.current === generation) errorService.reportError(err);
    } finally {
      if (generationRef.current === generation) {
        setIsLoading(false);
        isLoadingRef.current = false;
      } else {
        isLoadingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    buildCursors(selectedDeviceUuids).then(() => {
      loadMore();
    });
  }, [selectedDeviceUuids.join(',')]);

  return { groups, isLoading, hasMore, loadMore };
}
