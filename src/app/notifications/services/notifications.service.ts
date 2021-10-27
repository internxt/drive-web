import UilCheckCircle from '@iconscout/react-unicons/icons/uil-check-circle';
import UilTimesCircle from '@iconscout/react-unicons/icons/uil-times-circle';
import UilExclamationTriangle from '@iconscout/react-unicons/icons/uil-exclamation-triangle';
import UilInfoCircle from '@iconscout/react-unicons/icons/uil-info-circle';
import { uniqueId } from 'lodash';
import { createElement } from 'react';
import { toast } from 'react-toastify';

import NotificationToast from '../components/NotificationToast/NotificationToast';

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

const notificationsService = {
  show: (text: string, type: ToastType, duration = 3000): void => {
    const configByType = {
      success: {
        icon: UilCheckCircle,
      },
      error: {
        icon: UilTimesCircle,
      },
      warning: {
        icon: UilExclamationTriangle,
      },
      info: {
        icon: UilInfoCircle,
      },
    };

    toast(
      createElement(NotificationToast, {
        text,
        IconComponent: configByType[type].icon,
      }),
      {
        toastId: uniqueId(),
        autoClose: duration,
        position: 'bottom-right',
        closeButton: false,
        hideProgressBar: true,
        type,
        style: {
          height: 'auto',
        },
      },
    );
  },
};

export default notificationsService;
