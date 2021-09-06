import { match } from 'react-router';

import LoadingFileExplorer from '../../components/LoadingFileExplorer/LoadingFileExplorer';
import { AppView } from '../../models/enums';
import navigationService from '../../services/navigation.service';
import teamsService from '../../services/teams.service';

export default function Success(props: { match: match<{ sessionId: string }> }): JSX.Element {
  teamsService.checkSessionStripe(props.match.params.sessionId).then(() => navigationService.push(AppView.Login));

  return (
    <div className="flex jutify-center content-center mt-3">
      <LoadingFileExplorer />
    </div>
  );
}
