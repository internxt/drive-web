export interface FileToUpload {
  name: string;
  size: number;
  type: string;
  content: File;
  parentFolderId: string;
}
