import React from 'react';
import SharedView from './SharedView';
import { ShareViewProvider } from './context/SharedViewContextProvider';

const SharedViewWrapper: React.FC = () => {
  return (
    <ShareViewProvider>
      <SharedView />
    </ShareViewProvider>
  );
};

export default SharedViewWrapper;
