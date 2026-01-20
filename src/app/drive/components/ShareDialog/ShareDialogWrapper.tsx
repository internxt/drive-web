import { ShareDialogProvider } from './context';
import ShareDialog, { ShareDialogProps } from './ShareDialog';

const ShareDialogWrapper = (props: Omit<ShareDialogProps, 'user'>) => {
  return (
    <ShareDialogProvider>
      <ShareDialog {...props} />
    </ShareDialogProvider>
  );
};

export default ShareDialogWrapper;
