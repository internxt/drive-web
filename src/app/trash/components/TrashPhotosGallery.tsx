import { FC, useEffect } from 'react';

import { SerializablePhoto } from 'app/store/slices/photos';

import Empty from 'app/shared/components/Empty/Empty';
import Skeleton from 'app/photos/components/Skeleton';
import Dialog from 'app/shared/components/Dialog/Dialog';
import Preview from 'app/photos/components/Preview';
import { Grid } from 'app/photos/components/Grid';

import EmptyPicture from '../../../assets/images/empty-photos.png';

import { PhotoId } from '@internxt/sdk/dist/photos';

export type DeletePending = null | keyof typeof DELETE_TYPES;
export const DELETE_TYPES = {
  SELECTED: 'selected',
  PREVIEW: 'preview',
  ALL: 'all',
};

export type TrashPhotosGalleryProps = {
  isLoading: boolean;
  photos: SerializablePhoto[];
  deletePending: string | null;
  setDeletePending: (deleteState: string | null) => void;
  showModal: boolean;
  setShowModal: (boolean) => void;
  fetchPhotos: () => void;
  setPreviewIndex: (index: number | null) => void;
  togglePhotos: (id: string) => void;
  downloadPhoto: () => void;
  previewPhotoIndex: number | null;
  selectedPhotos: PhotoId[];
  deletePhotos: () => void;
};

const TrashPhotosGallery: FC<TrashPhotosGalleryProps> = ({
  isLoading,
  photos,
  deletePending,
  setDeletePending,
  showModal,
  setShowModal,
  fetchPhotos,
  setPreviewIndex,
  togglePhotos,
  downloadPhoto,
  previewPhotoIndex,
  selectedPhotos,
  deletePhotos,
}) => {
  const handleCloseModal = () => {
    setDeletePending(null);
    setShowModal(false);
  };

  const showEmpty = !isLoading && photos.length === 0;
  const showSkeleton = isLoading && photos.length === 0;

  useEffect(fetchPhotos, []);

  useEffect(() => {
    if (selectedPhotos.length > 0) setDeletePending(DELETE_TYPES.SELECTED);
    else setDeletePending(null);
  }, [selectedPhotos]);

  return (
    <div className="flex h-full w-full flex-col">
      {showEmpty ? (
        <Empty
          title="Your photos trash is empty"
          subtitle="Here will appear your deleted photos"
          icon={
            <img className="h-auto w-72" src={EmptyPicture} draggable="false" alt="Photos used in the Internxt app" />
          }
        />
      ) : (
        <>
          {showSkeleton ? (
            <Skeleton />
          ) : (
            <Grid
              selected={selectedPhotos}
              photos={photos}
              onUserScrolledToTheEnd={fetchPhotos}
              setPreviewIndex={setPreviewIndex}
              toggleSelect={togglePhotos}
            />
          )}
        </>
      )}
      <Preview
        onDeleteClick={() => {
          setDeletePending('preview');
          setShowModal(true);
        }}
        onDownloadClick={() => previewPhotoIndex !== null && downloadPhoto()}
        onClose={() => {
          if (previewPhotoIndex !== null && deletePending === null) setPreviewIndex(null);
        }}
        photos={photos}
        previewIndex={previewPhotoIndex}
        setPreviewIndex={setPreviewIndex}
      />
      <Dialog
        onClose={() => handleCloseModal()}
        onPrimaryAction={deletePhotos}
        isOpen={showModal && deletePending === DELETE_TYPES.ALL}
        title="Empty Photos trash?"
        subtitle="All items in the Photos trash will be permanently deleted. This action cannot be undone."
        onSecondaryAction={() => handleCloseModal()}
        primaryAction="Empty trash"
        secondaryAction="Cancel"
        primaryActionColor="danger"
      />
      {/* These dialogs are duplicatdded to avoid flickering while using headless ui transitions */}
      <Dialog
        onClose={() => handleCloseModal()}
        onPrimaryAction={deletePhotos}
        isOpen={(showModal && deletePending === DELETE_TYPES.SELECTED) || deletePending === DELETE_TYPES.PREVIEW}
        title="Delete permanently?"
        subtitle="This action cannot be undone."
        onSecondaryAction={() => handleCloseModal()}
        primaryAction="Delete"
        secondaryAction="Cancel"
        primaryActionColor="danger"
      />
    </div>
  );
};

export { TrashPhotosGallery };
