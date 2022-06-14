import { Transition } from '@headlessui/react';
import { CheckCircle, Info, Warning, WarningOctagon, X } from 'phosphor-react';
import { ToastShowProps, ToastType } from '../../services/notifications.service';

const NotificationToast = ({
  text,
  type,
  action,
  visible,
  closable,
  onClose,
}: Omit<ToastShowProps, 'duration'> & { visible: boolean; onClose: () => void }): JSX.Element => {
  let Icon: typeof CheckCircle | undefined;
  let IconColor: string | undefined;

  switch (type) {
    case ToastType.Success:
      Icon = CheckCircle;
      IconColor = 'text-green';
      break;
    case ToastType.Error:
      Icon = WarningOctagon;
      IconColor = 'text-red-50';
      break;
    case ToastType.Info:
      Icon = Info;
      IconColor = 'text-primary';
      break;
    case ToastType.Warning:
      Icon = Warning;
      IconColor = 'text-yellow';
      break;
  }

  return (
    <Transition
      appear
      enter="transition ease-out duration-200"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-200"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
      show={visible}
    >
      <div
        className="flex max-w-md items-center rounded-lg border border-gray-10 bg-white p-3 shadow-subtle-hard"
        style={{ minWidth: '300px' }}
      >
        {Icon && <Icon weight="fill" className={`${IconColor} mr-1.5`} size={24} />}

        <p className="flex-1 break-words text-gray-80 line-clamp-2">{text}</p>
        {action && (
          <button onClick={action.onClick} className="ml-3 truncate font-medium text-primary">
            {action.text}
          </button>
        )}
        {closable && (
          <button onClick={onClose} className="ml-3 text-gray-40">
            <X size={20} />
          </button>
        )}
      </div>
    </Transition>
  );
};

export default NotificationToast;
