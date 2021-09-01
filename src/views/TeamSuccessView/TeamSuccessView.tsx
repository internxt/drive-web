import { match } from 'react-router';

import LoadingFileExplorer from '../../components/LoadingFileExplorer/LoadingFileExplorer';
import history from '../../lib/history';
import teamsService from '../../services/teams.service';

export default function Success(props: { match: match<{ sessionId: string }> }): JSX.Element {
  teamsService.checkSessionStripe(props.match.params.sessionId).then(() => history.push('/'));

  return (
    <div className="flex jutify-center content-center mt-3">
      <LoadingFileExplorer />
    </div>
  );
}
