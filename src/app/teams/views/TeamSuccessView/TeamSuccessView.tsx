import { match } from 'react-router';
import LoadingPulse from 'app/shared/components/LoadingPulse/LoadingPulse';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';

import teamsService from '../../services/teams.service';

export default function Success(props: { match: match<{ sessionId: string }> }): JSX.Element {
  teamsService.checkSessionStripe(props.match.params.sessionId).then(() => navigationService.push(AppView.Login));

  return (
    <div className="flex jutify-center content-center mt-3">
      <LoadingPulse />
    </div>
  );
}
