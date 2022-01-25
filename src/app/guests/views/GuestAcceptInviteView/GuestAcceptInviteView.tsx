import { useState } from 'react';
import { AxiosError, AxiosResponse } from 'axios';
import { Form } from 'react-bootstrap';

import { getPasswordDetails } from '../../../auth/services/auth.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import BaseButton from '../../../shared/components/forms/BaseButton';
import httpService from '../../../core/services/http.service';
import localStorageService from '../../../core/services/local-storage.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { useAppDispatch } from 'app/store/hooks';
import { userThunks } from 'app/store/slices/user';

export default function GuestAcceptInvitationView(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();

  async function verifyPassword() {
    const details = await getPasswordDetails(password);
    const user = localStorageService.getUser() as UserSettings;

    const body = JSON.stringify({
      email: user.email,
      password: details.encryptedCurrentPassword,
    });

    return fetch(`${process.env.REACT_APP_API_URL}/api/access`, {
      method: 'post',
      headers: httpService.getHeaders(false, false),
      body,
    }).then((res) => {
      if (res.status !== 200) {
        throw Error('Wrong password');
      }

      return details;
    });
  }

  // TODO: Use on axios handling error interceptor
  function extractMessageFromError(err: AxiosError): string {
    let errMsg: string;
    const error: AxiosError = err as AxiosError;

    const isServerError = !!error.response;
    const serverUnavailable = !!error.request;

    if (isServerError) {
      errMsg = (error.response as AxiosResponse<{ error: string }>).data.error;
    } else if (serverUnavailable) {
      errMsg = 'Server not available';
    } else {
      errMsg = error.message;
    }

    return errMsg;
  }

  async function joinWorkspace() {
    try {
      const details = await verifyPassword();
      const payload = Buffer.from(password).toString('hex');

      await httpService.post('/api/guest/accept', { payload, details });

      notificationsService.show(
        'Invitation to workspace accepted. Log in again to start using the workspace',
        ToastType.Success,
      );

      await dispatch(userThunks.logoutThunk());
    } catch (err) {
      throw new Error(extractMessageFromError(err as AxiosError));
    }
  }

  return (
    <div className="flex flex-col m-10 h-full justify-center">
      <h1>You have been invited</h1>
      <p className="my-3">By joining this workspace all your data will be lost.</p>
      <p className="my-3">
        For strict security reasons and to protect your data at Internxt you will be given a new shared encryption key
        and you will be able to use your Internxt account from 0. This action cannot be undone.
      </p>
      <p className="my-3">
        You will be able to open and download all files inside the given workspace that has been shared with
      </p>
      <p className="my-3">Please, confirm your password to start the workspace migration.</p>

      <div className="flex flex-col my-10 items-center">
        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Control
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>

        <BaseButton
          disabled={loading || invitationAccepted || password === ''}
          className="primary"
          onClick={() => {
            setLoading(true);
            joinWorkspace()
              .then(() => {
                setInvitationAccepted(true);
              })
              .catch((err) => {
                notificationsService.show(
                  `${err.message || 'Error accepting invitation'}. Please, try again`,
                  ToastType.Error,
                );
                setPassword('');
              })
              .finally(() => {
                setLoading(false);
              });
          }}
        >
          Accept Invite
        </BaseButton>
      </div>
    </div>
  );
}
