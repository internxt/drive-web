import LoadingFileExplorer from '../LoadingFileExplorer/LoadingFileExplorer';
import { checkSessionStripe } from '../../services/teams.sucess.service';
import history from '../../lib/history';

export default function Success(props) {
  checkSessionStripe(props.match.params.sessionId).then(() => history.push('/'));

  return (
    <div style={{ display: 'flex', marginTop: '12rem', justifyContent: 'center', alignContent: 'center' }}>
      <LoadingFileExplorer />
    </div>
  );
}