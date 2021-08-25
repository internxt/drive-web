import { Component, ReactNode } from 'react';
import { match } from 'react-router';
import 'react-toastify/dist/ReactToastify.css';

import history from '../../lib/history';
import notify, { ToastType } from '../../components/Notifications';
import httpService from '../../services/http.service';

interface DeactivationTeamsViewProps {
    match: match<{ token: string}>
}

class DeactivationTeamsView extends Component<DeactivationTeamsViewProps> {
    state = {
      token: this.props.match.params.token,
      errorReason: ''
    }

    IsValidToken = (token: string): boolean => {
      return /^[a-z0-9]{512}$/.test(token);
    }

    ClearAndRedirect = (): void => {
      console.log('Clear and redirect');
      localStorage.clear();

      notify('Your account has been deactivated', ToastType.Info);
      history.push('/');

    }

    confirmDeactivation = (token: string): Promise<void> => {
      console.log(token);

      return httpService.get<void>('/api/confirmDeactivationTeam/' + token).then(() => {
        this.ClearAndRedirect();
      }).catch(err => {
        notify('Invalid token', ToastType.Warning);
        history.push('/');
      });
    }

    componentDidMount(): void {
      console.log('TOKEN WEB', this.state.token);
      if (this.IsValidToken(this.state.token)) {
        this.confirmDeactivation(this.state.token);
      } else {

        notify('Invalid token', ToastType.Warning);
        history.push('/');

      }
    }

    invalidDeactivationToken(): JSX.Element {
      return <div>
        <p>Invalid token</p>
      </div>;
    }

    render(): ReactNode {
      return <div></div>;
    }
}

export default DeactivationTeamsView;