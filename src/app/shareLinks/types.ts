export interface ShareLink {
  id: number;
  token: string;
  timesValid: number;
  views: number;
  active: boolean;
  isFolder: boolean;
  createdAt: Date;
  updatedAt: Date;
  item: {
    id: number;
    name: string;
    type: string;
    bucket: string;
  };
}
