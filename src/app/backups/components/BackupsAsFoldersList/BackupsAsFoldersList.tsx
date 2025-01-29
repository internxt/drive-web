import { skinSkeleton } from 'app/shared/Skeleton';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import dateService from '../../../core/services/date.service';
import iconService from '../../../drive/services/icon.service';
import sizeService from '../../../drive/services/size.service';
import { DriveItemData } from '../../../drive/types';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import Empty from '../../../shared/components/Empty/Empty';
import { List, MenuItemType } from '@internxt/ui';

export default function BackupsAsFoldersList({
  className = '',
  contextMenu,
  currentItems,
  isLoading,
  selectedItems,
  hasMoreItems,
  getPaginatedBackupList,
  onItemClicked,
  onItemSelected,
  onSelectedItemsChanged,
}: {
  className?: string;
  contextMenu: Array<MenuItemType<DriveItemData>>;
  currentItems: DriveItemData[];
  selectedItems: DriveItemData[];
  isLoading: boolean;
  hasMoreItems: boolean;
  getPaginatedBackupList: () => void;
  onItemClicked: (item: DriveItemData) => void;
  onItemSelected: (changes: { device: DriveItemData; isSelected: boolean }[]) => void;
  onSelectedItemsChanged: (changes: { props: DriveItemData; value: boolean }[]) => void;
}): JSX.Element {
  const { translate } = useTranslationContext();

  return (
    <div className={`${className} flex min-h-0 grow flex-col`}>
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
          itemComposition={[
            (item) => {
              const displayName = item.type === 'folder' ? item.name : `${item.plainName}.${item.type}`;
              const Icon = iconService.getItemIcon(item.isFolder, item.type);

              return (
                <div className="relative flex min-w-activity grow items-center justify-start pr-3">
                  <div className="mr-3 h-8 w-8">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="relative flex grow cursor-default truncate">
                    <button
                      className="z-30 shrink cursor-pointer truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClicked(item);
                      }}
                    >
                      {displayName}
                    </button>
                  </div>
                </div>
              );
            },
            (item) => {
              return <div>{dateService.formatDefaultDate(item.createdAt, translate)}</div>;
            },
            (item) => {
              const size = 'size' in item ? sizeService.bytesToString(item.size) : '';
              return <div>{size}</div>;
            },
          ]}
          onClick={(item) => {
            const unselectedDevices = selectedItems.map((deviceSelected) => ({
              device: deviceSelected,
              isSelected: false,
            }));
            onItemSelected([...unselectedDevices, { device: item, isSelected: true }]);
          }}
          onNextPage={getPaginatedBackupList}
          hasMoreItems={hasMoreItems}
          onDoubleClick={onItemClicked}
          skinSkeleton={skinSkeleton}
          emptyState={
            <Empty
              icon={<img className="w-36" alt="" src={folderEmptyImage} />}
              title="This folder is empty"
              subtitle="Use Internxt Desktop to upload your data"
            />
          }
          menu={contextMenu}
          selectedItems={selectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          onSelectedItemsChanged={onSelectedItemsChanged}
        />
      </div>
    </div>
  );
}
