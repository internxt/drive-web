import { NavLink } from 'react-router-dom';
import { Transition } from '@headlessui/react';
import { CheckCircle, Info, Warning, WarningOctagon, X } from '@phosphor-icons/react';
import { ToastShowProps, ToastType } from '../../services/notifications.service';
import { Loader } from '@internxt/ui';

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
      IconColor = 'text-red';
      break;
    case ToastType.Info:
      Icon = Info;
      IconColor = 'text-primary';
      break;
    case ToastType.Warning:
      Icon = Warning;
      IconColor = 'text-yellow';
      break;
    case ToastType.Loading:
      IconColor = 'text-primary';
      break;
  }

  return (
    <Transition
      appear
      enter="transition ease-out duration-200"
      enterFrom="opacity-0 scale-95"
      enterTo="opacity-100 scale-100"
      leave="transition ease-in duration-200"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
      show={visible}
    >
      <div
        className="flex max-w-xl items-center rounded-lg border border-gray-10 bg-surface p-3 dark:bg-gray-5"
        style={{ minWidth: '300px' }}
      >
        {type === ToastType.Loading && <Loader classNameLoader="mr-1.5 h-6 w-6" />}
        {Icon && <Icon weight="fill" className={`${IconColor} mr-1.5`} size={24} />}

        <p className="line-clamp-2 flex-1 whitespace-pre break-words text-gray-80">{text}</p>
        {action &&
          (action.to ? (
            <NavLink
              className="ml-3 truncate font-medium text-primary no-underline"
              exact
              to={action.to}
              onClick={action.onClick}
            >
              {action.text}
            </NavLink>
          ) : (
            <button onClick={action.onClick} className="ml-3 truncate font-medium text-primary">
              {action.text}
            </button>
          ))}

        {closable && (
          <button
            onClick={() => {
              onClose();
            }}
            className="ml-3 text-gray-40"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </Transition>
  );
};

export default NotificationToast;
