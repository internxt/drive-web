import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import tasksService from '../services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask } from '../types';
import { useTaskManagerGetNotifications } from '.';

const createUploadTask = (fileName: string) =>
  tasksService.create<UploadFileTask>({
    action: TaskType.UploadFile,
    cancellable: true,
    showNotification: true,
    fileName,
    fileType: 'txt',
    isFileNameValidated: true,
    item: { uploadFile: new File(['content'], `${fileName}.txt`), parentFolderId: 'parent-folder-uuid' },
  });

describe('Task notifications list', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    tasksService.clearTasks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('When many tasks are created at once, then the list is rebuilt only once with all of them', () => {
    const { result } = renderHook(() => useTaskManagerGetNotifications());
    const getNotificationsSpy = vi.spyOn(tasksService, 'getNotifications');

    act(() => {
      Array.from({ length: 1000 }, (_, index) => createUploadTask(`file-${index}`));
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(getNotificationsSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toHaveLength(1000);
  });

  test('When a task is updated, then the list shows its new state', () => {
    const taskId = createUploadTask('report');
    const { result } = renderHook(() => useTaskManagerGetNotifications());

    act(() => {
      tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success } });
      vi.runOnlyPendingTimers();
    });

    expect(result.current[0].status).toBe(TaskStatus.Success);
  });

  test('When the list is filtered by status, then only matching tasks are shown', () => {
    const reportTaskId = createUploadTask('report');
    createUploadTask('invoice');
    const { result } = renderHook(() => useTaskManagerGetNotifications({ status: [TaskStatus.Success] }));

    act(() => {
      tasksService.updateTask({ taskId: reportTaskId, merge: { status: TaskStatus.Success } });
      vi.runOnlyPendingTimers();
    });

    expect(result.current.map((notification) => notification.title)).toEqual(['report.txt']);
  });
});
