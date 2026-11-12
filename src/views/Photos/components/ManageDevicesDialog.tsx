import { Dialog, Modal } from '@internxt/ui';
import { DeviceMobileIcon, XIcon } from '@phosphor-icons/react';
import { HTTP_STATUS_CODES } from 'app/core/constants';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useState } from 'react';
import errorService from 'services/error.service';
import photosDevicesService from '../services/photosDevices.service';
import { PhotoDevice } from '../types';

interface ManageDevicesDialogProps {
  isOpen: boolean;
  devices: PhotoDevice[];
  onClose: () => void;
  onDeviceRemoved: (deviceUuid: string) => void;
}

const ManageDevicesDialog = ({ isOpen, devices, onClose, onDeviceRemoved }: ManageDevicesDialogProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [deviceToDelete, setDeviceToDelete] = useState<PhotoDevice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeConfirmation = () => {
    if (!isDeleting) setDeviceToDelete(null);
  };

  const deleteDevice = async (device: PhotoDevice) => {
    setIsDeleting(true);
    try {
      await photosDevicesService.deleteDevice(device.uuid);
      notificationsService.show({ type: ToastType.Success, text: translate('views.photos.devices.deleted') });
      onDeviceRemoved(device.uuid);
    } catch (err) {
      const error = errorService.castError(err);
      if (error.status === HTTP_STATUS_CODES.NOT_FOUND) {
        notificationsService.show({ type: ToastType.Info, text: translate('views.photos.devices.notFound') });
        onDeviceRemoved(device.uuid);
      } else {
        errorService.reportError(error);
        notificationsService.show({ type: ToastType.Error, text: translate('views.photos.devices.deleteError') });
      }
    } finally {
      setIsDeleting(false);
      setDeviceToDelete(null);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen && !deviceToDelete} onClose={onClose} className="p-0" maxWidth="max-w-lg">
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <p className="text-xl font-medium text-gray-100">{translate('views.photos.devices.title')}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={translate('views.photos.devices.close')}
            className="-mr-2 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10"
          >
            <XIcon size={20} />
          </button>
        </div>
        <ul
          aria-label={translate('views.photos.devices.title')}
          className="flex max-h-80 flex-col gap-2 overflow-y-auto px-6 pb-6"
        >
          {devices.map((device) => (
            <li
              key={device.uuid}
              aria-label={device.name}
              className="flex items-center gap-4 rounded-xl border border-gray-10 p-3"
            >
              <DeviceMobileIcon size={28} className="shrink-0 text-primary" />
              <p className="min-w-0 grow truncate font-medium text-gray-100">{device.name}</p>
              <button
                type="button"
                onClick={() => setDeviceToDelete(device)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-red hover:bg-red/10"
              >
                {translate('views.photos.devices.delete')}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
      <Dialog
        isOpen={!!deviceToDelete}
        onClose={closeConfirmation}
        onSecondaryAction={closeConfirmation}
        onPrimaryAction={() => deviceToDelete && deleteDevice(deviceToDelete)}
        title={translate('views.photos.devices.deleteDialog.title', { name: deviceToDelete?.name })}
        subtitle={translate('views.photos.devices.deleteDialog.description')}
        primaryAction={translate('views.photos.devices.deleteDialog.confirm')}
        secondaryAction={translate('actions.cancel')}
        primaryActionColor="danger"
        isLoading={isDeleting}
      />
    </>
  );
};

export default ManageDevicesDialog;
