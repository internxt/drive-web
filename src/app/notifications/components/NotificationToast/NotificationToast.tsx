import { Transition } from '@headlessui/react';
import { CheckCircle, Info, Warning, WarningOctagon } from 'phosphor-react';
import { ToastShowProps, ToastType } from '../../services/notifications.service';

const NotificationToast = ({
  text,
  type,
  action,
  subtitle,
  visible,
}: Omit<ToastShowProps, 'duration'> & { visible: boolean }): JSX.Element => {
  let Icon: typeof CheckCircle | undefined;
  let IconColor: string | undefined;

  switch (type) {
    case ToastType.Success:
      Icon = CheckCircle;
      IconColor = 'text-green-50';
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
      IconColor = 'text-yellow-30';
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
        className="flex items-center space-x-2 rounded-lg border border-gray-10 bg-white p-3 shadow-subtle-hard"
        style={{ width: '350px' }}
      >
        {Icon && <Icon weight="fill" className={`${IconColor}`} size={24} />}
        {subtitle ? (
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium text-gray-80">{text}</p>
            <p className="truncate text-gray-60">{subtitle}</p>
          </div>
        ) : (
          <p className="flex-1 truncate text-gray-80">{text}</p>
        )}
        {action && (
          <button onClick={action.onClick} className="truncate font-medium text-primary">
            {action.text}
          </button>
        )}
      </div>
    </Transition>
  );
};

export default NotificationToast;
