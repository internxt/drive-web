import { Widget } from '@typeform/embed-react';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';

import { useAppDispatch } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import RealtimeService from 'app/core/services/socket.service';
import { referralsThunks } from 'app/store/slices/referrals';

const SurveyDialog = (props: { isOpen: boolean }): JSX.Element => {
  const dispatch = useAppDispatch();

  const onClose = (): void => {
    RealtimeService.getInstance().onEvent((data) => {
      if (data.event === 'USER_STORAGE_UPDATED') {
        dispatch(referralsThunks.refreshUserReferrals());
      }
    });

    dispatch(uiActions.setIsSurveyDialogOpen(false));
  };

  const user = useSelector((state: RootState) => state.user.user) as UserSettings;

  return (
    <BaseDialog
      isOpen={props.isOpen}
      title={''}
      panelClasses="px-6 py-8 w-156"
      onClose={onClose}
      bgColor={'bg-transparent'}
    >
      {user && (
        <div className="py-10">
          <Widget
            id="yM3EyqJE"
            height={500}
            hidden={{
              email: user.email,
              uuid: user.uuid,
            }}
          />
        </div>
      )}
    </BaseDialog>
  );
};

export default SurveyDialog;
