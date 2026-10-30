import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import tasksService from '../../services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask } from '../../types';
import { uiActions } from '../../../store/slices/ui';
import TaskLogger from './TaskLogger';

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: (selector: (state: unknown) => unknown) => selector({ ui: { isFileLoggerOpen: true } }),
}));
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));
vi.mock('../TaskLoggerItem/TaskLoggerItem', () => ({
  default: ({ notification }: { notification: { title: string } }) => <span>{notification.title}</span>,
}));

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

const closeButton = () => screen.getAllByRole('button')[1];

describe('Task logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksService.clearTasks();
  });

  test('When the user closes the logger right after an upload starts, then it stays open and keeps the upload', () => {
    render(<TaskLogger />);
    const taskId = createUploadTask('report');

    fireEvent.click(closeButton());

    expect(dispatch).not.toHaveBeenCalledWith(uiActions.setIsFileLoggerOpen(false));
    expect(tasksService.findTask(taskId)).toBeDefined();
  });

  test('When every task has finished and the user closes the logger, then it closes and the tasks are cleared', () => {
    const taskId = createUploadTask('report');
    tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success } });
    render(<TaskLogger />);

    fireEvent.click(closeButton());

    expect(dispatch).toHaveBeenCalledWith(uiActions.setIsFileLoggerOpen(false));
    expect(tasksService.findTask(taskId)).toBeUndefined();
  });
});
