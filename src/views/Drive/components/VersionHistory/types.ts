export interface FileVersion {
  id: string;
  date: Date;
  userName: string;
  expiresInDays?: number;
  isAutosave?: boolean;
  isCurrent?: boolean;
}
