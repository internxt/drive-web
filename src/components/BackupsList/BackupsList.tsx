import React, { ReactNode } from 'react';
import { Backup } from '../../models/interfaces';
import { downloadBackup } from '../../services/download.service';
import DriveListItemSkeleton from '../loaders/DriveListItemSkeleton';
import BackupsListItem from './BackupsListItem';
import { connect } from 'react-redux';
import { AppDispatch } from '../../store';
import { uniqueId } from 'lodash';
import { DownloadFileTask, TaskProgress, TaskStatus, TaskType } from '../../services/task-manager.service';
import { taskManagerActions } from '../../store/slices/task-manager';

interface Props {
  items: Backup[] | null;
  isLoading: boolean;
  dispatch: AppDispatch;
}

class BackupsList extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  async onDownload(backup: Backup): Promise<void> {
    const taskId = uniqueId();
    const task: DownloadFileTask = {
      id: taskId,
      action: TaskType.DownloadFile,
      status: TaskStatus.Pending,
      progress: TaskProgress.Min,
      file: { name: backup.name, type: 'zip' },
      showNotification: true,
      cancellable: true,
    };

    const onProgress = (progress) => {
      this.props.dispatch(
        taskManagerActions.updateTask({
          taskId,
          merge: {
            status: TaskStatus.InProcess,
            progress,
          },
        }),
      );
    };

    const onFinished = () => {
      this.props.dispatch(
        taskManagerActions.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Success,
          },
        }),
      );
    };

    const actionState = await downloadBackup(backup, onProgress, onFinished);
    this.props.dispatch(taskManagerActions.addTask(task));

    this.props.dispatch(
      taskManagerActions.updateTask({
        taskId,
        merge: {
          stop: async () => actionState?.stop(),
        },
      }),
    );
  }

  get hasItems(): boolean {
    return !!this.props.items && this.props.items.length > 0;
  }

  get itemsList(): JSX.Element[] {
    if (this.props.items === null) return [];
    return this.props.items.map((item: Backup) => (
      <BackupsListItem key={item.id} backup={item} onDownload={(backup) => this.onDownload(backup)} />
    ));
  }

  get loadingSkeleton(): JSX.Element[] {
    return Array(10)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  }

  render(): ReactNode {
    const { isLoading } = this.props;

    return (
      <div className="flex flex-col flex-grow bg-white h-full ">
        <div className="files-list font-semibold flex border-b border-l-neutral-30 bg-white text-neutral-500 py-3 text-sm">
          <div className="w-0.5/12 pl-3 flex items-center justify-start box-content"></div>
          <div className="flex-grow flex items-center px-3">Name</div>
          <div className="w-2/12 hidden items-center xl:flex"></div>
          <div className="w-3/12 hidden items-center lg:flex">Last update</div>
          <div className="w-2/12 flex items-center">Size</div>
          <div className="w-1/12 flex items-center rounded-tr-4px">Actions</div>
        </div>
        <div className="h-full overflow-y-auto">{isLoading ? this.loadingSkeleton : this.itemsList}</div>
      </div>
    );
  }
}

export default connect(() => {
  return {};
})(BackupsList);
