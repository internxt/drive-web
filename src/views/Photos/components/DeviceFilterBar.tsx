import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { PhotoDevice } from '../services/photos.service';

interface DeviceFilterBarProps {
  devices: PhotoDevice[];
  selectedUuids: Set<string>;
  onSelectionChange: (uuids: Set<string>) => void;
}

export default function DeviceFilterBar({
  devices,
  selectedUuids,
  onSelectionChange,
}: Readonly<DeviceFilterBarProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const allSelected = selectedUuids.size === 0 || selectedUuids.size === devices.length;

  const handleAllClick = () => {
    onSelectionChange(new Set(devices.map((d) => d.uuid)));
  };

  const handleDeviceClick = (uuid: string) => {
    if (selectedUuids.size === devices.length) {
      onSelectionChange(new Set([uuid]));
      return;
    }
    const next = new Set(selectedUuids);
    if (next.has(uuid)) {
      next.delete(uuid);
      if (next.size === 0) {
        onSelectionChange(new Set(devices.map((d) => d.uuid)));
        return;
      }
    } else {
      next.add(uuid);
      if (next.size === devices.length) {
        onSelectionChange(new Set(devices.map((d) => d.uuid)));
        return;
      }
    }
    onSelectionChange(next);
  };

  const isDeviceActive = (uuid: string): boolean => {
    if (allSelected) return true;
    return selectedUuids.has(uuid);
  };

  return (
    <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-10">
      <button
        onClick={handleAllClick}
        className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
          allSelected ? 'bg-primary text-white' : 'bg-gray-5 text-gray-60 hover:bg-gray-10'
        }`}
      >
        {translate('photos.gallery.filter.all')}
      </button>
      {devices.map((device) => (
        <button
          key={device.uuid}
          onClick={() => handleDeviceClick(device.uuid)}
          title={device.plainName}
          className={`max-w-[160px] truncate rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            isDeviceActive(device.uuid) ? 'bg-primary text-white' : 'bg-gray-5 text-gray-60 hover:bg-gray-10'
          }`}
        >
          {device.plainName}
        </button>
      ))}
    </div>
  );
}
