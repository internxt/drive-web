import * as Unicons from '@iconscout/react-unicons';
import { uniqueId } from 'lodash';
import { createElement } from 'react';
import { toast } from 'react-toastify';

import NotificationToast from '../components/NotificationToast/NotificationToast';

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}

const notificationsService = {
  show: (text: string, type: ToastType, duration: number = 3000): void => {
    const configByType = {
      success: {
        icon: Unicons.UilCheckCircle
      },
      error: {
        icon: Unicons.UilTimesCircle
      },
      warning: {
        icon: Unicons.UilExclamationTriangle
      },
      info: {
        icon: Unicons.UilInfoCircle
      }
    };

    toast(
      createElement(NotificationToast, {
        text,
        IconComponent: configByType[type].icon
      })
      , {
        toastId: uniqueId(),
        autoClose: duration,
        position: 'bottom-right',
        closeButton: false,
        hideProgressBar: true,
        type,
        style: {
          height: 'auto'
        }
      });
  }
};

export default notificationsService;