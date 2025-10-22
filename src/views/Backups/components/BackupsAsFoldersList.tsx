import { skinSkeleton } from '../../../app/shared/Skeleton';
import folderEmptyImage from '../../../assets/icons/light/folder-open.svg';
import dateService from '../../../app/core/services/date.service';
import sizeService from '../../../app/drive/services/size.service';
import { DriveItemData } from '../../../app/drive/types';
import { useTranslationContext } from '../../../app/i18n/provider/TranslationProvider';
import Empty from '../../../app/shared/components/Empty/Empty';
import { List, MenuItemType } from '@internxt/ui';
import transformItemService from 'app/drive/services/item-transform.service';
import { items } from '@internxt/lib';
import { t } from 'i18next';
import iconService from 'app/drive/services/icon.service';

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
              const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);

              return (
                <div className={'file-list-item group'} data-test={`file-list-${item.isFolder ? 'folder' : 'file'}`}>
                  <div className="flex shrink-0 min-w-[200px] grow items-center pr-3">
                    {/* ICON */}
                    <div className="box-content flex items-center pr-4">
                      <div className="relative flex h-10 w-10 justify-center drop-shadow-soft">
                        <ItemIconComponent
                          className="h-full"
                          data-test={`file-list-${
                            item.isFolder ? 'folder' : 'file'
                          }-${transformItemService.getItemPlainNameWithExtension(item)}`}
                        />
                      </div>
                    </div>

                    {/* NAME */}
                    <div className="flex w-[200px] grow cursor-pointer items-center truncate pr-2">
                      <button
                        data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
                        className="truncate"
                        title={
                          transformItemService.getItemPlainNameWithExtension(item) ?? items.getItemDisplayName(item)
                        }
                        onClick={
                          (item.isFolder && !item.deleted) || (!item.isFolder && item.status === 'EXISTS')
                            ? () => onItemClicked(item)
                            : undefined
                        }
                      >
                        <p className="truncate">
                          {transformItemService.getItemPlainNameWithExtension(item) ?? items.getItemDisplayName(item)}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* DATE */}
                  <div className="block shrink-0 w-date items-center whitespace-nowrap">
                    {dateService.formatDefaultDate(item.updatedAt, t)}
                  </div>

                  {/* SIZE */}
                  <div className="w-size shrink-0 items-center whitespace-nowrap">
                    {sizeService.bytesToString(item.size, false) === '' ? (
                      <span className="opacity-25">—</span>
                    ) : (
                      sizeService.bytesToString(item.size, false)
                    )}
                  </div>
                </div>
              );
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
