export interface IRoot {
  name: string;
  folderId: string | null;
  childrenFiles: File[];
  childrenFolders: IRoot[];
  fullPathEdited: string;
}
