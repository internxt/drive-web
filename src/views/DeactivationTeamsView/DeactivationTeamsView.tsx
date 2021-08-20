import { Component, ReactNode } from 'react';
import axios from 'axios';
import { match } from 'react-router';
import 'react-toastify/dist/ReactToastify.css';

import history from '../../lib/history';
import notify, { ToastType } from '../../components/Notifications';

interface DeactivationTeamsViewProps {
    match: match<{ token: string}>
}

class DeactivationTeamsView extends Component<DeactivationTeamsViewProps> {
    state = {
      token: this.props.match.params.token,
      result: this.confirmDeactivation(),
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

    ConfirmDeactivateTeam = (token: string): Promise<void> => {
      console.log(token);

      return axios.get('/api/confirmDeactivationTeam/' + token).then(res => {
        console.log('All is ok');
        this.ClearAndRedirect();
      }).catch(err => {
        notify('Invalid token', ToastType.Warning);
        history.push('/');
      });
    }

    componentDidMount(): void {
      console.log('TOKEN WEB', this.state.token);
      if (this.IsValidToken(this.state.token)) {
        this.ConfirmDeactivateTeam(this.state.token);
      } else {

        notify('Invalid token', ToastType.Warning);
        history.push('/');

      }
    }

    confirmDeactivation(): JSX.Element {
      return <p>Your account has been deactivated</p>;
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