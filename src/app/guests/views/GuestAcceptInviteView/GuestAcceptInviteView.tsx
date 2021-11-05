import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { getPasswordDetails } from '../../../auth/services/auth.service';
import { UserSettings } from '../../../auth/types';
import BaseButton from '../../../shared/components/forms/BaseButton';
import httpService from '../../../core/services/http.service';
import localStorageService from '../../../core/services/local-storage.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';

export default function GuestAcceptInvitationView(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const [password, setPassword] = useState('');

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
            verifyPassword()
              .then((details) => {
                return httpService
                  .post('/api/guest/accept', {
                    payload: Buffer.from(password).toString('hex'),
                    details,
                  })
                  .then(() => {
                    setInvitationAccepted(true);
                    notificationsService.show(
                      'Invitation to workspace accepted, wait until migration is complete',
                      ToastType.Success,
                    );
                  });
              })
              .catch((err) => {
                setPassword('');
                notificationsService.show(
                  `${err.message || 'Error accepting invitation'}. Please, try again`,
                  ToastType.Error,
                );
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
