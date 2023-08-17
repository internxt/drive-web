import { renderAsync } from 'docx-preview';
import { useEffect } from 'react';

interface FileDocumentViewerProps {
  blob: Blob;
  setIsErrorWhileDownloading: (isErrorWhileDownloading: boolean) => void;
}

const FileDocumentViewer = ({ blob, setIsErrorWhileDownloading }: FileDocumentViewerProps): JSX.Element => {
  useEffect(() => {
    const docxContent = document.getElementById('docxContainer');
    if (docxContent) {
      renderAsync(blob, docxContent).catch((err) => {
        setIsErrorWhileDownloading(true);
        console.error(err);
      });
    }
  }, [blob]);

  return (
    <div>
      <div id="docxContainer" />
    </div>
  );
};

export default FileDocumentViewer;
