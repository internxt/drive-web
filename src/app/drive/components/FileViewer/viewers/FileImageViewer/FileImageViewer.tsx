import { FormatFileViewerProps } from '../../FileViewer';

import './FileImageViewer.scss';

const FileImageViewer = (props: FormatFileViewerProps): JSX.Element => {
  const fileUrl = URL.createObjectURL(props.blob);
  return (
    <div className="flex max-h-screen max-w-full flex-col items-center justify-center text-white">
      <div className="relative max-h-screen max-w-full">
        <img src={fileUrl} className="relative max-h-screen object-contain" draggable={false} />
      </div>
    </div>
  );
};

export default FileImageViewer;
