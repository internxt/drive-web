import { renderAsync } from 'docx-preview';
import { useEffect } from 'react';

interface FileDocumentViewerProps {
  blob: Blob;
}

const FileDocumentViewer = ({ blob }: FileDocumentViewerProps): JSX.Element => {
  useEffect(() => {
    const docxContent = document.getElementById('docxContainer');
    if (docxContent) {
      renderAsync(blob, docxContent);
    }
  }, [blob]);

  return (
    <div>
      <div id="docxContainer" />
    </div>
  );
};

export default FileDocumentViewer;
