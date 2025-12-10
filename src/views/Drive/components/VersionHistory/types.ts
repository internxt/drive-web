export interface FileVersion {
  id: string;
  fileId: string;
  networkFileId: string;
  size: bigint;
  status: 'EXISTS' | 'DELETED';
  createdAt: Date;
  updatedAt: Date;
  userId?: number;
  expiresInDays?: number;
  isAutosave?: boolean;
  isCurrent?: boolean;
}
