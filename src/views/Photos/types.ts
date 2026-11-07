export interface PhotoDevice {
  uuid: string;
  name: string;
}

export type MonthKey = `${number}-${string}`;

export interface PhotoMonth {
  key: MonthKey;
  deviceUuid: string;
  folderUuid: string;
}
