import errorService from 'services/error.service';
import { TaskStatus } from '../tasks/types';
import { PersistUploadRepository } from './DatabaseUploadRepository';

export const markUploadAsInProcess = (uploadRepository: PersistUploadRepository, taskId: string): void => {
  uploadRepository.setUploadState(taskId, TaskStatus.InProcess).catch((error) => errorService.reportError(error));
};

export const forgetUploadState = (uploadRepository: PersistUploadRepository, taskId: string): void => {
  uploadRepository.removeUploadState(taskId).catch((error) => errorService.reportError(error));
};
