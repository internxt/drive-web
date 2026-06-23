import { skinSkeleton } from 'components/Skeleton';
import folderEmptyImage from '../../../assets/icons/light/folder-open.svg';
import { DriveItemData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { List, Empty } from '@internxt/ui';
import PhotoListItem from './PhotoListItem';

interface PhotosAsFoldersListProps {
  currentItems: DriveItemData[];
  selectedItems: DriveItemData[];
  isLoading: boolean;
  hasMoreItems: boolean;
  getPaginatedList: () => void;
  onItemClicked: (item: DriveItemData) => void;
  onItemSelected: (changes: { device: DriveItemData; isSelected: boolean }[]) => void;
  onSelectedItemsChanged: (changes: { props: DriveItemData; value: boolean }[]) => void;
}

export default function PhotosAsFoldersList({
  currentItems,
  isLoading,
  selectedItems,
  hasMoreItems,
  getPaginatedList,
  onItemClicked,
  onItemSelected,
  onSelectedItemsChanged,
}: Readonly<PhotosAsFoldersListProps>): JSX.Element {
  const { translate } = useTranslationContext();

  const renderPhotoListItem = (item: DriveItemData) => <PhotoListItem item={item} onItemClicked={onItemClicked} />;

  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<DriveItemData, 'name' | 'updatedAt' | 'size'>
          header={[
            {
              label: translate('drive.list.columns.name'),
              width: 'flex-1 min-w-activity truncate cursor-pointer',
              name: 'name',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('drive.list.columns.modified'),
              width: 'w-date',
              name: 'updatedAt',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('drive.list.columns.size'),
              width: 'cursor-pointer items-center w-size',
              name: 'size',
              orderable: true,
              defaultDirection: 'ASC',
            },
          ]}
          items={currentItems}
          isLoading={isLoading}
          itemComposition={[renderPhotoListItem]}
          onClick={(item) => {
            const unselected = selectedItems.map((s) => ({ device: s, isSelected: false }));
            onItemSelected([...unselected, { device: item, isSelected: true }]);
          }}
          onNextPage={getPaginatedList}
          hasMoreItems={hasMoreItems}
          onDoubleClick={onItemClicked}
          skinSkeleton={skinSkeleton}
          emptyState={
            <Empty
              icon={<img className="w-36" alt="" src={folderEmptyImage} />}
              title={translate('photos.empty.folder.title')}
              subtitle={translate('photos.empty.folder.subtitle')}
            />
          }
          menu={[]}
          selectedItems={selectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          onSelectedItemsChanged={onSelectedItemsChanged}
        />
      </div>
    </div>
  );
}
