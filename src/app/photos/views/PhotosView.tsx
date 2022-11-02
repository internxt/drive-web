import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Empty from '../../shared/components/Empty/Empty';

import { RootState } from '../../store';
import { photosSlice, PhotosState, SerializablePhoto } from '../../store/slices/photos';
import photosThunks from '../../store/slices/photos/thunks';
import EmptyPicture from '../../../assets/images/empty-photos.png';
import Preview from '../components/Preview';
import ShareDialog from '../components/ShareDialog';
import Skeleton from '../components/Skeleton';
import Toolbar from '../components/Toolbar';
import { Grid } from '../components/Grid';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

export default function PhotosView({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useDispatch();
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);

  const [deletePending, setDeletePending] = useState<null | 'selected' | 'preview'>(null);
  const [sharePending, setSharePending] = useState<null | 'selected' | 'preview'>(null);

  useEffect(fetchPhotos, []);

  useEffect(() => {
    const listener = (e) => {
      if (e.code === 'Escape' && photosState.previewIndex === null && deletePending === null && sharePending === null) {
        dispatch(photosSlice.actions.unselectAll());
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [photosState.previewIndex, deletePending, sharePending]);

  useEffect(() => {
    if (deletePending) removeSelectedItems();
  }, [deletePending]);

  function fetchPhotos() {
    dispatch(photosThunks.fetchThunk());
  }

  // TODO: NEED TO CHANGE THE IMPLEMENTATION OF REMOVE TO WORK CORRECTLY
  // PhotoStatus: Exists -> Trashed
  function onConfirmDelete(typeOfDelete: string | null, deleteItemId?: string) {
    if (typeOfDelete === 'selected') {
      dispatch(photosThunks.deleteThunk(photosState.selectedItems));
    } else if (typeOfDelete === 'preview' && deleteItemId !== undefined) {
      dispatch(photosThunks.deleteThunk([deleteItemId]));
    }
  }

  const getSelectedItemsIds = () =>
    deletePending === 'selected'
      ? photosState.selectedItems
      : photosState.previewIndex !== null
      ? [photosState.items[photosState.previewIndex].id]
      : [];

  const removeSelectedItems = () => {
    const selectedItemsId = getSelectedItemsIds();
    const selectedItems = photosState.items.filter((item) => selectedItemsId.includes(item.id));

    dispatch(photosSlice.actions.removeItems(selectedItemsId));

    resetDeleteAndSelectStates();

    const deleteItemId = deletePending === 'preview' ? selectedItemsId[0] : undefined;
    callUndoToast(selectedItems, deleteItemId);
  };

  const resetDeleteAndSelectStates = () => {
    if (deletePending === 'selected') {
      dispatch(photosSlice.actions.unselectAll());
    } else if (deletePending === 'preview' && photosState.previewIndex !== null) {
      const { items, previewIndex } = photosState;
      const previewIndexIsOutOfBounds = previewIndex > items.length - 2;
      if (previewIndexIsOutOfBounds) {
        const index = items.length - 1 > 0 ? previewIndex - 1 : null;
        handleSetPreviewIndex(index);
      }
    }
    setDeletePending(null);
  };

  const callUndoToast = (selectedItems: SerializablePhoto[], deleteItemId?: string) => {
    notificationsService.show({
      text: `${numberOfSelectedItems > 1 ? 'Items' : 'Item'} moved to trash`,
      type: ToastType.Info,
      closable: false,
      onFinishDuration: () => onConfirmDelete(deletePending, deleteItemId),
      onUndo: () => {
        dispatch(photosSlice.actions.push(selectedItems));
        //TODO: reminder before merge, ask how photos are sorted in backend when fetching
        dispatch(photosSlice.actions.sortItems('size'));
      },
    });
  };

  const handleSetPreviewIndex = (index: number | null) => dispatch(photosSlice.actions.setPreviewIndex(index));

  const handleToggleSelectPhotos = (id: string) => dispatch(photosSlice.actions.toggleSelect(id));

  const showEmpty = !photosState.isLoading && photosState.items.length === 0;
  const showSkeleton = photosState.isLoading && photosState.items.length === 0;
  const numberOfSelectedItems = photosState.selectedItems.length;

  const toolbarProps =
    numberOfSelectedItems !== 0
      ? {
          onDeleteClick: () => setDeletePending('selected'),
          onShareClick: () => setSharePending('selected'),
          onDownloadClick: () => {
            const photos = photosState.selectedItems.map(
              (id) => photosState.items.find((item) => item.id === id) as SerializablePhoto,
            );
            dispatch(photosThunks.downloadThunk(photos));
            dispatch(photosSlice.actions.unselectAll());
          },
          onUnselectClick: () => dispatch(photosSlice.actions.unselectAll()),
        }
      : {};

  return (
    <>
      <div className={`${className} flex h-full w-full flex-col overflow-y-hidden`}>
        {showEmpty ? (
          <Empty
            title="Your gallery is empty"
            subtitle="Start using Internxt mobile app to sync all your photos"
            icon={
              <img className="h-auto w-72" src={EmptyPicture} draggable="false" alt="Photos used in the Internxt app" />
            }
          />
        ) : (
          <>
            <Toolbar {...toolbarProps} numberOfSelectedItems={numberOfSelectedItems} />
            {showSkeleton ? (
              <Skeleton />
            ) : (
              <Grid
                selected={photosState.selectedItems}
                photos={photosState.items}
                onUserScrolledToTheEnd={fetchPhotos}
                setPreviewIndex={handleSetPreviewIndex}
                toggleSelect={handleToggleSelectPhotos}
              />
            )}
          </>
        )}
      </div>
      <Preview
        onDeleteClick={() => setDeletePending('preview')}
        onShareClick={() => setSharePending('preview')}
        onDownloadClick={() =>
          photosState.previewIndex !== null &&
          dispatch(photosThunks.downloadThunk([photosState.items[photosState.previewIndex]]))
        }
        onClose={() => {
          if (photosState.previewIndex !== null && deletePending === null && sharePending === null)
            handleSetPreviewIndex(null);
        }}
        previewIndex={photosState.previewIndex}
        photos={photosState.items}
        setPreviewIndex={handleSetPreviewIndex}
      />
      <ShareDialog
        onClose={() => setSharePending(null)}
        isOpen={sharePending === 'selected'}
        photos={photosState.selectedItems}
      />
      <ShareDialog
        onClose={() => setSharePending(null)}
        isOpen={sharePending === 'preview'}
        photos={photosState.previewIndex !== null ? [photosState.items[photosState.previewIndex].id] : []}
      />
    </>
  );
}
