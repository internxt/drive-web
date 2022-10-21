import { createContext, FC, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { photosSlice, PhotosState } from 'app/store/slices/photos';
import { AppDispatch, RootState } from 'app/store';
import photosThunks from '../../store/slices/photos/thunks';

import { DriveItemData, FolderPath } from 'app/drive/types';

import { Trash, ClockCounterClockwise } from 'phosphor-react';
import { Icon } from 'app/photos/components/Icon';
import { PreferencesTabID, TabSelector } from '../components/TabSelector';
import { DELETE_TYPES, TrashPhotosGallery, TrashPhotosGalleryProps } from '../components/TrashPhotosGallery';

const TabContext = createContext<{
  activeTab: PreferencesTabID;
  setActiveTab: (value: PreferencesTabID) => void;
}>({ activeTab: 'photosGallery', setActiveTab: () => undefined });

const TABS: {
  id: PreferencesTabID;
  label: string;
  component: React.FunctionComponent<
    {
      className?: string;
    } & TrashPhotosGalleryProps
  >;
}[] = [
  // Hidden until this drive trash is enabled
  // { id: 'drive', label: 'Drive', component: PhotosTrashView },
  { id: 'photosGallery', label: 'Photos Gallery', component: TrashPhotosGallery },
];

type TrashViewProps = {
  namePath: FolderPath[];
  isLoading: boolean;
  items: DriveItemData[];
  currentFolderId: number;
  dispatch: AppDispatch;
};

const TrashView: FC<TrashViewProps> = () => {
  const [activeTab, setActiveTab] = useState<PreferencesTabID>('photosGallery');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [deletePending, setDeletePending] = useState<string | null>(null);

  const dispatch = useDispatch();

  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);

  const photos = photosState.trashPhotos;
  const selectedPhotos = photosState.selectedTrashPhotos;
  const previewPhotoIndex = photosState.previewTrashPhotoIndex;
  const isLoading = photosState.isLoadingTrashPhotos;

  const onClickTrashIcon = () => {
    !deletePending && setDeletePending(DELETE_TYPES.ALL);
    setShowModal(true);
  };

  const fetchTrashPhotos = () => {
    dispatch(photosThunks.fetchTrashedPhotosThunk());
  };

  // TODO: NEED TO CHANGE THE IMPLEMENTATION OF REMOVE TO WORK CORRECTLY
  // PhotoStatus: Trashed -> Deleted
  const deletePhotos = () => {
    if (deletePending === DELETE_TYPES.SELECTED) {
      dispatch(photosThunks.deleteThunk(selectedPhotos));
      dispatch(photosSlice.actions.unselectAllTrash());
    } else if (deletePending === DELETE_TYPES.PREVIEW && previewPhotoIndex !== null) {
      const previewIndexIsOutOfBounds = previewPhotoIndex > photos.length - 2;
      if (previewIndexIsOutOfBounds) {
        dispatch(photosSlice.actions.setPreviewTrashPhotoIndex(photos.length - 1 > 0 ? previewPhotoIndex - 1 : null));
      }

      dispatch(photosThunks.deleteThunk([photos[previewPhotoIndex].id]));
    }
    setDeletePending(null);
  };

  const handleSetPreviewIndex = (index: number | null) =>
    dispatch(photosSlice.actions.setPreviewTrashPhotoIndex(index));

  const handleTogglePhotos = (id: string) => dispatch(photosSlice.actions.toggleSelectTrashPhotos(id));

  const handleDownloadPhoto = () =>
    previewPhotoIndex !== null && dispatch(photosThunks.downloadThunk([photos[previewPhotoIndex]]));

  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-row">
        <TabSelector tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        <div className="flex flex-grow items-end justify-end pr-5">
          {/* Hidden until this functionality is enabled */}
          {/* <Icon Target={ClockCounterClockwise} onClick={() => false} /> */}
          <Icon Target={Trash} onClick={onClickTrashIcon} />
        </div>
      </div>
      <TabContext.Provider value={{ activeTab, setActiveTab }}>
        <div className="flex flex-grow flex-row justify-center overflow-y-auto">
          <div className="w-screen  overflow-x-visible">
            {TABS.map(
              ({ component: Component, id }) =>
                Component && (
                  <Component
                    className={`${activeTab !== id ? 'hidden' : ''}`}
                    key={id}
                    isLoading={isLoading}
                    photos={photos}
                    selectedPhotos={selectedPhotos}
                    previewPhotoIndex={previewPhotoIndex}
                    deletePending={deletePending}
                    showModal={showModal}
                    setDeletePending={setDeletePending}
                    setShowModal={setShowModal}
                    fetchPhotos={fetchTrashPhotos}
                    setPreviewIndex={handleSetPreviewIndex}
                    togglePhotos={handleTogglePhotos}
                    downloadPhoto={handleDownloadPhoto}
                    deletePhotos={deletePhotos}
                  />
                ),
            )}
            <div className="h-8" /> {/* flexbox glitch trick */}
          </div>
        </div>
      </TabContext.Provider>
    </div>
  );
};

export default TrashView;
