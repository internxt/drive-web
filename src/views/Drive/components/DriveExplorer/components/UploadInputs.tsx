import { ChangeEvent, RefObject } from 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    directory?: string;
    webkitdirectory?: string;
  }
}

interface UploadInputsProps {
  fileInputRef: RefObject<HTMLInputElement>;
  folderInputRef: RefObject<HTMLInputElement>;
  onFileInputChanged: (event: ChangeEvent<HTMLInputElement>) => void;
  onFolderInputChanged: (event: ChangeEvent<HTMLInputElement>) => void;
}

const UploadInputs = ({
  fileInputRef,
  folderInputRef,
  onFileInputChanged,
  onFolderInputChanged,
}: UploadInputsProps): JSX.Element => (
  <>
    <input
      className="hidden"
      ref={fileInputRef}
      type="file"
      onChange={onFileInputChanged}
      multiple={true}
      data-test="input-file"
    />
    <input
      className="hidden"
      ref={folderInputRef}
      type="file"
      webkitdirectory=""
      onChange={onFolderInputChanged}
      multiple={true}
      data-test="input-folder"
    />
  </>
);

export default UploadInputs;
