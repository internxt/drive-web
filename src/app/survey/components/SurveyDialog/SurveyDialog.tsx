import { Widget } from '@typeform/embed-react';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { useEffect } from 'react';

import { useAppDispatch } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import RealtimeService from 'app/core/services/socket.service';
import { referralsThunks } from 'app/store/slices/referrals';

const SurveyDialog = (props: { isOpen: boolean }): JSX.Element => {
  const clientId = RealtimeService.getInstance().getClientId();
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;

  const onClose = (): void => {
    dispatch(uiActions.setIsSurveyDialogOpen(false));
  };

  useEffect(() => {
    RealtimeService.getInstance().onEvent((data) => {
      if (data.event === 'USER_STORAGE_UPDATED') {
        dispatch(referralsThunks.refreshUserReferrals());
      }
    });
  }, []);

  return (
    <BaseDialog
      isOpen={props.isOpen}
      title={''}
      panelClasses="px-6 py-8 w-4/5 max-w-screen-xl"
      onClose={onClose}
      bgColor={'bg-transparent'}
    >
      {user && (
        <div className="py-10">
          <Widget
            id="yM3EyqJE"
            height={600}
            hidden={{
              clientid: clientId,
              uuid: user.uuid
            }}
          />
        </div>
      )}
    </BaseDialog>
  );
};

export default SurveyDialog;
