import LoadingFileExplorer from '../../components/LoadingFileExplorer/LoadingFileExplorer';
import { checkSessionStripe } from '../../services/teams.sucess.service';
import history from '../../lib/history';
import { match } from 'react-router';

export default function Success(props: { match: match<{sessionId: string}>}): JSX.Element {
  checkSessionStripe(props.match.params.sessionId).then(() => history.push('/'));

  return (
    <div className="flex jutify-center content-center mt-3">
      <LoadingFileExplorer />
    </div>
  );
}