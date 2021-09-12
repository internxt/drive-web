import React, { useState } from 'react';
import { match } from 'react-router';
import BaseButton from '../../components/Buttons/BaseButton';
import httpService from '../../services/http.service';
import notificationsService, { ToastType } from '../../services/notifications.service';

export default function GuestAcceptInvitationView(props: { match: match<{ sessionId: string }> }): JSX.Element {

  const [loading, setLoading] = useState(false);
  const [invitationAccepted, setInvitationAccepted] = useState(false);

  return (
    <div className="flex flex-col m-10 h-full justify-center">
      <h1>You have been invited</h1>
      <p className="my-3">By joining this workspace all your data will be lost.</p>
      <p className="my-3">For strict security reasons and to protect your data at Internxt you will be given a new shared encryption key and you will be able to use your Internxt account from 0. This action cannot be undone.</p>
      <p className="my-3">You will be able to open and download all files inside the given workspace that has been shared with</p>

      <div className="flex flex-col my-10 items-center">
        <BaseButton
          disabled={loading || invitationAccepted}
          classes="primary"
          onClick={() => {
            setLoading(true)
            httpService.post('/api/guest/accept').then(() => {
              setInvitationAccepted(true);
              notificationsService.show('Invitation to workspace accepted, wait until migration is complete', ToastType.Success);
            }).catch(() => {
              notificationsService.show('Error accepting invitation. Please, try later', ToastType.Error);
            }).finally(() => {
              setLoading(false)
            })
          }}
        >
          Accept Invite
        </BaseButton>
      </div>
    </div>
  );
}
