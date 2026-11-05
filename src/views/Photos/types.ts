export interface PhotoDevice {
  uuid: string;
  name: string;
}

export type MonthKey = `${number}-${string}`;

export type DayKey = `${MonthKey}-${string}`;

export interface PhotoMonth {
  key: MonthKey;
  deviceUuid: string;
  folderUuid: string;
}

export interface Photo {
  uuid: string;
  name: string;
  type: string;
  month: MonthKey;
  day: DayKey;
  takenAt: string;
}
