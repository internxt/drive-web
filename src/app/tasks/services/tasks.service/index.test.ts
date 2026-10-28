import { beforeEach, describe, expect, test } from 'vitest';
import tasksService from '.';
import { TaskStatus, TaskType, UploadFileTask } from '../../types';

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

describe('Task notifications', () => {
  beforeEach(() => {
    tasksService.clearTasks();
  });

  test('When a task progresses, then only its notification changes and the others stay the same', () => {
    const reportTaskId = createUploadTask('report');
    createUploadTask('invoice');
    const [invoiceBefore, reportBefore] = tasksService.getNotifications();

    tasksService.updateTask({ taskId: reportTaskId, merge: { progress: 0.5 } });
    const [invoiceAfter, reportAfter] = tasksService.getNotifications();

    expect(invoiceAfter).toBe(invoiceBefore);
    expect(reportAfter).not.toBe(reportBefore);
    expect(reportAfter.progress).toBe(0.5);
  });

  test('When several tasks are created, then their notifications are listed from newest to oldest', () => {
    createUploadTask('report');
    createUploadTask('invoice');
    createUploadTask('contract');

    expect(tasksService.getNotifications().map((notification) => notification.title)).toEqual([
      'contract.txt',
      'invoice.txt',
      'report.txt',
    ]);
  });

  test('When a task is removed, then its notification disappears', () => {
    const reportTaskId = createUploadTask('report');
    createUploadTask('invoice');

    tasksService.removeTask(reportTaskId);

    expect(tasksService.getNotifications().map((notification) => notification.title)).toEqual(['invoice.txt']);
  });

  test('When a task is looked up after being updated, then its latest state is returned', () => {
    const reportTaskId = createUploadTask('report');

    tasksService.updateTask({ taskId: reportTaskId, merge: { status: TaskStatus.Success } });

    expect(tasksService.findTask(reportTaskId)?.status).toBe(TaskStatus.Success);
    expect(tasksService.isTaskFinished(reportTaskId)).toBe(true);
  });

  test('When the task list is cleared, then no task or notification remains', () => {
    const reportTaskId = createUploadTask('report');

    tasksService.clearTasks();

    expect(tasksService.findTask(reportTaskId)).toBeUndefined();
    expect(tasksService.getNotifications()).toEqual([]);
  });
});
