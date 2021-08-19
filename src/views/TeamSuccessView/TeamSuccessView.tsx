import LoadingFileExplorer from '../../components/LoadingFileExplorer/LoadingFileExplorer';
import { checkSessionStripe } from '../../services/teams.sucess.service';
import history from '../../lib/history';

export default function Success(props: { match: any}): JSX.Element {
  checkSessionStripe(props.match.params.sessionId).then(() => history.push('/'));

  return (
    <div className="flex jutify-center content-center mt-3">
      <LoadingFileExplorer />
    </div>
  );
}