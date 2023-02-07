import { match } from 'react-router';
import LoadingPulse from 'app/shared/components/LoadingPulse/LoadingPulse';

import teamsService from '../../services/teams.service';
import { useAppDispatch } from 'app/store/hooks';
import { userThunks } from 'app/store/slices/user';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { t } from 'i18next';

export default function Success(props: { match: match<{ sessionId: string }> }): JSX.Element {
  const dispatch = useAppDispatch();

  teamsService.checkSessionStripe(props.match.params.sessionId).then(() => {
    dispatch(userThunks.logoutThunk());
    notificationsService.show({ text: t('success.teamsSubscriptionRedeemed'), type: ToastType.Info });
  });

  return (
    <div className="jutify-center mt-3 flex content-center">
      <LoadingPulse />
    </div>
  );
}
