export interface ShareLink {
  id: number;
  token: string;
  timesValid: number;
  views: number;
  active: boolean;
  isFolder: boolean;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  item: {
    id: number;
    name: string;
    type: string;
    bucket: string;
    size: number;
  };
}
