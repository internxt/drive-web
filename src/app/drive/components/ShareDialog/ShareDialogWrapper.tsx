import { ShareDialogProvider } from './context/ShareDialogContextProvider';
import ShareDialog, { ShareDialogProps } from './ShareDialog';

export const ShareDialogWrapper = (props: Omit<ShareDialogProps, 'user'>) => (
  <ShareDialogProvider>
    <ShareDialog {...props} />
  </ShareDialogProvider>
);
