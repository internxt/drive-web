import React, { useEffect, useState } from 'react';
import xlsxPreview from 'xlsx-preview';

interface FileDocumentsViewerProps {
  blob: Blob;
  setIsPreviewAvailable: (isPreviewAvailable: boolean) => void;
}

const FileXlsxViewer: React.FC<FileDocumentsViewerProps> = ({ blob, setIsPreviewAvailable }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    xlsxPreview
      .xlsx2Html(blob, {
        output: 'arrayBuffer',
      })
      .then((html) => {
        setHtmlContent(URL.createObjectURL(new Blob([html], { type: 'text/html' })));
      })
      .catch((err) => {
        setIsPreviewAvailable(false);
        console.error(err);
      });
  }, [blob]);

  return (
    <div className="flex h-screen w-screen overflow-hidden px-20 pt-20">
      <object className="h-full w-full bg-white" data={htmlContent}></object>
    </div>
  );
};

export default FileXlsxViewer;
