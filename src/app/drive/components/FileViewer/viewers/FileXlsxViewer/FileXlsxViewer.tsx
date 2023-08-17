import React, { useEffect, useState } from 'react';
import xlsxPreview from 'xlsx-preview';

interface FileDocumentsViewerProps {
  blob: Blob;
}

const FileXlsxViewer: React.FC<FileDocumentsViewerProps> = ({ blob }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    xlsxPreview
      .xlsx2Html(blob, {
        output: 'arrayBuffer',
      })
      .then((html) => {
        setHtmlContent(URL.createObjectURL(new Blob([html], { type: 'text/html' })));
      });
  }, [blob]);

  return <object className="h-screen w-screen bg-white" data={htmlContent}></object>;
};

export default FileXlsxViewer;
