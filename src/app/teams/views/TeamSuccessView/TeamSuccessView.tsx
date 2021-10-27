import { match } from 'react-router';
import LoadingFileExplorer from 'app/shared/components/LoadingFileExplorer/LoadingFileExplorer';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';

import teamsService from '../../services/teams.service';

export default function Success(props: { match: match<{ sessionId: string }> }): JSX.Element {
  teamsService.checkSessionStripe(props.match.params.sessionId).then(() => navigationService.push(AppView.Login));

  return (
    <div className="flex jutify-center content-center mt-3">
      <LoadingFileExplorer />
    </div>
  );
}
