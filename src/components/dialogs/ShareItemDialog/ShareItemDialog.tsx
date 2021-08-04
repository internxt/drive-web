import { useEffect, useState } from 'react';
import { UilClipboardAlt, UilTimes } from '@iconscout/react-unicons';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectUser } from '../../../store/slices/user';
import { storageActions } from '../../../store/slices/storage';
import { uiActions } from '../../../store/slices/ui';

import { DriveItemData } from '../../../models/interfaces';
import notify from '../../Notifications';
import { generateShareLink } from '../../../services/share.service';
import history from '../../../lib/history';
import { generateFileKey, Network } from '../../../lib/network';
import localStorageService from '../../../services/localStorage.service';

interface ShareDialogProps {
  item: DriveItemData
}

const DEFAULT_VIEWS = 10;

const ShareDialog = ({ item }: ShareDialogProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(state => state.ui.isShareItemDialogOpen);
  const user = useAppSelector(selectUser);
  const [linkToCopy, setLinkToCopy] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [numberOfAttempts, setNumberOfAttempts] = useState(DEFAULT_VIEWS);

  const onClose = (): void => {
    dispatch(uiActions.setIsShareItemDialogOpen(false));
    dispatch(storageActions.setItemToShare(0));
  };

  const handleShareLink = async (views: number) => {
    try {
      const fileId = item.fileId;

      if (item.isDraggable === false) {
        setLinkToCopy('https://internxt.com/Internxt.pdf');
        return;
      }

      const xUser = localStorageService.getUser();

      if (!xUser) {
        return history.push('/login');
      }

      const { bucket, mnemonic, userId, email } = xUser;
      const network = new Network(email, userId, mnemonic);
      const { index } = await network.getFileInfo(bucket, fileId);
      const fileToken = await network.createFileToken(bucket, fileId, 'PULL');
      const fileEncryptionKey = await generateFileKey(mnemonic, bucket, Buffer.from(index, 'hex'));

      const link = await generateShareLink(fileId, {
        bucket,
        fileToken,
        isFolder: false,
        views,
        encryptionKey: fileEncryptionKey.toString('hex')
      });

      window.analytics.track('file-share');
      setLinkToCopy(link);
    } catch (err) {
      if (err.status === 401) {
        return history.push('/login');
      }
      notify(err.message, 'error');
      setLinkToCopy('Unavailable link');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const delay = setTimeout(() => {
      handleShareLink(numberOfAttempts);
    }, 750);

    return () => clearTimeout(delay);
  }, [numberOfAttempts]);

  return (
    <div className={`${isOpen ? 'flex' : 'hidden'} absolute w-full h-full bg-m-neutral-100 bg-opacity-80 z-10`}>
      <div className='flex flex-col absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-104 py-8 rounded-lg overflow-hidden z-20 bg-white'>
        <span className='self-center text-center text-m-neutral-100'>{item.name + (item.type ? '.' + item.type : '')}</span>
        <UilTimes className='absolute right-8 cursor-pointer transition duration-200 ease-in-out text-blue-60 hover:text-blue-70' onClick={onClose} />

        <div className='w-full border-t border-m-neutral-60 my-6' />

        <div className='flex flex-col px-8'>
          <span className='text-neutral-500 self-center'>Share your Drive file with this private link</span>

          <div className='flex mt-3'>
            <span className='text-blue-60 mr-4'>1.</span>
            <div className='flex w-72 items-center rounded-md bg-l-neutral-20 px-4 py-3'>
              <span className='text-neutral-500 text-sm'>Enter the number of times you'd like the link to be valid:</span>
              <input
                type="number"
                value={numberOfAttempts}
                min={1}
                className='w-12 content-center text-blue-60'
                onChange={e => setNumberOfAttempts(parseInt(e.target.value))} />
            </div>
          </div>

          <div className='self-start mt-4'>
            <span className='text-blue-60 mr-4'>2.</span>
            <span className='text-neutral-500'>Get link to share</span>
          </div>

          <div className='flex w-72 items-center justify-between rounded-md bg-l-neutral-20 px-4 py-2 ml-8 mt-3 cursor-pointer'
            onClick={() => {
              navigator.clipboard.writeText(linkToCopy);
              notify('Link copied!', 'info', 2500);
            }}>
            <span className='text-neutral-900 text-xs'>{isLoading ? 'Loading link...' : linkToCopy}</span>
            <UilClipboardAlt className='text-blue-60' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
