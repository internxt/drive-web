import { renderAsync } from 'docx-preview';
import { useEffect } from 'react';

interface FileDocumentViewerProps {
  blob: Blob;
  setIsPreviewAvailable: (isPreviewAvailable: boolean) => void;
}

const FileDocumentViewer = ({ blob, setIsPreviewAvailable }: FileDocumentViewerProps): JSX.Element => {
  function renderDocx(docxContent: HTMLElement) {
    //Render the docx file in the docxContent element
    renderAsync(blob, docxContent)
      .then(() => {
        const docxWrapper = docxContent.querySelector('.docx-wrapper') as HTMLElement;

        // Remove the background and padding of the docxWrapper
        if (docxWrapper) {
          docxWrapper.style.background = 'none';
          docxWrapper.style.padding = '0px';
          docxWrapper.style.paddingTop = '80px';
        }
      })
      .catch((err) => {
        setIsPreviewAvailable(false);
        console.error(err);
      });
  }

  useEffect(() => {
    const docxContent = document.getElementById('docxContainer');
    if (docxContent) {
      renderDocx(docxContent);
    }
  }, [blob]);

  return (
    <div>
      <div id="docxContainer" />
    </div>
  );
};

export default FileDocumentViewer;
