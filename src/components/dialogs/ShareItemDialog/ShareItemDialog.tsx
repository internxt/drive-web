import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import * as Unicons from '@iconscout/react-unicons';
import { useState } from 'react';
import { useEffect } from 'react';

<<<<<<< HEAD
import { setItemToShare } from '../../../store/slices/storage';
=======
import { setItemsToDelete, setItemToShare } from '../../../store/slices/storage';
>>>>>>> 5d8189aad75a6da9f1b21cdef5a8b0df0ba1c061
import { DriveItemData } from '../../../models/interfaces';
import notify from '../../Notifications';
import { selectUser } from '../../../store/slices/user';
import shareService from '../../../services/share.service';
import history from '../../../lib/history';
import { uiActions } from '../../../store/slices/ui';
import BaseDialog from '../BaseDialog/BaseDialog';

import './ShareItemDialog.scss';

interface ShareItemDialogProps {
  item: DriveItemData
}

const DEFAULT_VIEWS = 10;

const ShareItemDialog = ({ item }: ShareItemDialogProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [linkToCopy, setLinkToCopy] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [numberOfIntents, setNumberOfIntents] = useState(DEFAULT_VIEWS);
  const isOpen = useAppSelector(state => state.ui.isShareItemDialogOpen);
  const onClose = (): void => {
    dispatch(uiActions.setIsShareItemDialogOpen(false));
    dispatch(setItemToShare(0));
  };
  const itemFullName = item.isFolder ? item.name : `${item.name}.${item.type}`;

  const handleShareLink = async (views: number) => {
    try {
      const fileId = item.isFolder ? item.id : item.fileId;

      if (!item.isFolder && item.isDraggable === false) {
        setLinkToCopy('https://internxt.com/Internxt.pdf');
        return;
      }

      const link = await shareService.generateShareLink(fileId, views, item.isFolder, user?.teams);

      window.analytics.track('file-share');
      setLinkToCopy(link);
    } catch (err) {
      if (err.status === 401) {
        history.push('/login');
      }
      if (err.status === 402) {
        const itemType = item.isFolder ? 'older' : 'ile';

        return notify(`F${itemType} too large. You can only share f${itemType}s of up to 200 MB.`, 'error');
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
      handleShareLink(numberOfIntents);
    }, 750);

    return () => clearTimeout(delay);
  }, [numberOfIntents]);

  return (
    <BaseDialog
      isOpen={isOpen}
      title={itemFullName}
      onClose={onClose}
    >
      <div className='share-dialog flex flex-col mb-8'>
        <hr className="border-t-1 border-l-neutral-50 my-4" />

        <div className="px-8">
          <span className='text-neutral-500 self-center'>Share your Drive {item.isFolder ? 'folder' : 'file'} with this private link</span>

          <div className='flex mt-3'>
            <span className='text-blue-60 mr-4'>1.</span>
            <div className='flex w-72 items-center rounded-md bg-l-neutral-20 px-4 py-3'>
              <span className='text-neutral-500 text-sm'>Enter the number of times you'd like the link to be valid:</span>
              <input
                type="number"
                value={numberOfIntents}
                min={1}
                className='w-12 content-center text-blue-60'
                onChange={e => setNumberOfIntents(parseInt(e.target.value))} />
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
            <Unicons.UilClipboardAlt className='text-blue-60' />
          </div>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ShareItemDialog;