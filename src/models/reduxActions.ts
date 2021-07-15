import { FileActionTypes, FileStatusTypes } from './interfaces';

export interface IActionUpdateFileLoggerEntry {
  filePath: string,
  action?: FileActionTypes,
  status?: FileStatusTypes,
  progress?: number,
  errorMessage?: string
}