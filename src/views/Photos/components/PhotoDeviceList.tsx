import { Camera, Trash } from '@phosphor-icons/react';
import { Empty, List } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { skinSkeleton } from 'components/Skeleton';
import { useState } from 'react';
import { PhotoDevice } from '../services/photos.service';

type PhotoDeviceItem = PhotoDevice & { id: number };

interface Props {
  items: PhotoDevice[];
  isLoading: boolean;
  onDeviceClicked: (device: PhotoDevice) => void;
  onDeviceDeleteRequested: (device: PhotoDevice) => void;
}

const PhotoDeviceList = ({ items, isLoading, onDeviceClicked, onDeviceDeleteRequested }: Props): JSX.Element => {
  const { translate } = useTranslationContext();
  const [selectedItems, setSelectedItems] = useState<PhotoDeviceItem[]>([]);

  const listItems: PhotoDeviceItem[] = items.map((d, i) => ({ ...d, id: i }));

  const renderNameCell = (device: PhotoDeviceItem) => (
    <div className="flex items-center gap-3 truncate">
      <Camera size={20} className="shrink-0 text-gray-60" />
      <span className="truncate text-sm">{device.plainName}</span>
    </div>
  );

  return (
    <div id="scrollableList" className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<PhotoDeviceItem, 'plainName'>
          header={[
            {
              label: translate('drive.list.columns.name'),
              width: 'flex-1 min-w-activity truncate shrink-0 cursor-pointer items-center',
              name: 'plainName',
              orderable: true,
              defaultDirection: 'ASC',
            },
          ]}
          items={listItems}
          isLoading={isLoading}
          itemComposition={[renderNameCell]}
          onDoubleClick={onDeviceClicked}
          skinSkeleton={skinSkeleton}
          emptyState={
            <Empty
              icon={<Camera size={64} className="text-gray-40" />}
              title={translate('photos.empty.title')}
              subtitle={translate('photos.empty.subtitle')}
            />
          }
          menu={[
            {
              name: translate('photos.deleteDevice.contextMenu'),
              icon: Trash,
              action: (device: PhotoDeviceItem) => onDeviceDeleteRequested(device),
              disabled: () => false,
            },
          ]}
          selectedItems={selectedItems}
          keyboardShortcuts={['unselectAll']}
          onSelectedItemsChanged={(changes) => {
            const next = changes.filter((c) => c.value).map((c) => c.props);
            setSelectedItems(next);
          }}
        />
      </div>
    </div>
  );
};

export default PhotoDeviceList;
