import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Empty from '../../shared/components/Empty/Empty';
import Dialog from '../../shared/components/Dialog/Dialog';
import { RootState } from '../../store';
import { photosSlice, PhotosState, SerializablePhoto } from '../../store/slices/photos';
import photosThunks from '../../store/slices/photos/thunks';
import EmptyPicture from '../../../assets/images/empty-photos.png';
import Preview from '../components/Preview';
import ShareDialog from '../components/ShareDialog';
import Skeleton from '../components/Skeleton';
import Toolbar from '../components/Toolbar';
import { Grid } from '../components/Grid';

export default function PhotosView({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useDispatch();
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);

  function fetchPhotos() {
    dispatch(photosThunks.fetchThunk());
  }

  useEffect(fetchPhotos, []);

  const [deletePending, setDeletePending] = useState<null | 'selected' | 'preview'>(null);
  const [sharePending, setSharePending] = useState<null | 'selected' | 'preview'>(null);

  useEffect(() => {
    const listener = (e) => {
      if (e.code === 'Escape' && photosState.previewIndex === null && deletePending === null && sharePending === null) {
        dispatch(photosSlice.actions.unselectAll());
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [photosState.previewIndex, deletePending, sharePending]);

  // TODO: NEED TO CHANGE THE IMPLEMENTATION OF REMOVE TO WORK CORRECTLY
  // PhotoStatus: Exists -> Trashed
  function onConfirmDelete() {
    if (deletePending === 'selected') {
      dispatch(photosThunks.deleteThunk(photosState.selectedItems));
      dispatch(photosSlice.actions.unselectAll());
    } else if (deletePending === 'preview' && photosState.previewIndex !== null) {
      const { items, previewIndex } = photosState;
      const previewIndexIsOutOfBounds = previewIndex > items.length - 2;
      if (previewIndexIsOutOfBounds) {
        dispatch(photosSlice.actions.setPreviewIndex(items.length - 1 > 0 ? previewIndex - 1 : null));
      }

      dispatch(photosThunks.deleteThunk([items[previewIndex].id]));
    }
    setDeletePending(null);
  }

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
      {/* These dialogs are duplicatded to avoid flickering while using headless ui transitions */}
      <Dialog
        onClose={() => setDeletePending(null)}
        onPrimaryAction={onConfirmDelete}
        isOpen={deletePending === 'selected'}
        title={`Delete ${numberOfSelectedItems} selected ${numberOfSelectedItems > 1 ? 'items' : 'item'}?`}
        subtitle="You can't undo this action"
        onSecondaryAction={() => setDeletePending(null)}
        primaryAction="Delete"
        secondaryAction="Cancel"
        primaryActionColor="danger"
      />
      <Dialog
        onClose={() => setDeletePending(null)}
        onPrimaryAction={onConfirmDelete}
        isOpen={deletePending === 'preview'}
        title="Delete this item?"
        subtitle="You can't undo this action"
        onSecondaryAction={() => setDeletePending(null)}
        primaryAction="Delete"
        secondaryAction="Cancel"
        primaryActionColor="danger"
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
