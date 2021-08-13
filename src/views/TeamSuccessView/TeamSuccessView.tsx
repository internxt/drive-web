import LoadingFileExplorer from '../../components/LoadingFileExplorer/LoadingFileExplorer';
import { checkSessionStripe } from '../../services/teams.sucess.service';
import history from '../../lib/history';

import './TeamSuccessView.scss';

export default function Success(props: { match: any}): JSX.Element {
  checkSessionStripe(props.match.params.sessionId).then(() => history.push('/'));

  return (
    <div style={{ display: 'flex', marginTop: '12rem', justifyContent: 'center', alignContent: 'center' }}>
      <LoadingFileExplorer />
    </div>
  );
}