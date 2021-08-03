import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectShowShareModal, setShowShareModal } from '../../../store/slices/ui';
import { UilTimes } from '@iconscout/react-unicons';
import { setItemsToDelete, setItemToShare } from '../../../store/slices/storage';
import { DriveItemData } from '../../../models/interfaces';
import { UilClipboardAlt } from '@iconscout/react-unicons';
import notify from '../../Notifications';
import { useState } from 'react';
import { useEffect } from 'react';
import { selectUser } from '../../../store/slices/user';
import { generateShareLink } from '../../../services/share.service';
import history from '../../../lib/history';

interface ShareDialogProps {
  item: DriveItemData
}

const DEFAULT_VIEWS = 10;

const ShareDialog = ({ item }: ShareDialogProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectShowShareModal);
  const user = useAppSelector(selectUser);
  const [linkToCopy, setLinkToCopy] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [numberOfIntents, setNumberOfIntents] = useState(DEFAULT_VIEWS);

  const onClose = (): void => {
    dispatch(setShowShareModal(false));
    dispatch(setItemsToDelete([]));
    dispatch(setItemToShare(0));
  };

  const handleShareLink = async (views: number) => {
    try {
      const fileId = item.isFolder ? item.id : item.fileId;

      if (!item.isFolder && item.isDraggable === false) {
        setLinkToCopy('https://internxt.com/Internxt.pdf');
        return;
      }

      const link = await generateShareLink(fileId, views, item.isFolder, user?.teams);

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
    <div className={`${isOpen ? 'flex' : 'hidden'} flex-col absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-104 py-8 rounded-lg overflow-hidden z-10 bg-white`}>
      <span className='self-center text-center text-m-neutral-100'>{item.name}{!item.isFolder && `.${item.type}` }{}</span>
      <UilTimes className='absolute right-8 cursor-pointer transition duration-200 ease-in-out text-blue-60 hover:text-blue-70' onClick={onClose} />

      <div className='w-full border-t border-m-neutral-60 my-6' />

      <div className='flex flex-col px-8'>
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
          <UilClipboardAlt className='text-blue-60' />
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
