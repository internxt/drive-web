import { Component, ReactNode } from 'react';
import { match } from 'react-router';
import 'react-toastify/dist/ReactToastify.css';
import { AppView } from '../../models/enums';

import httpService from '../../services/http.service';
import navigationService from '../../services/navigation.service';
import notificationsService, { ToastType } from '../../services/notifications.service';

interface DeactivationTeamsViewProps {
  match: match<{ token: string }>;
}

class DeactivationTeamsView extends Component<DeactivationTeamsViewProps> {
  state = {
    token: this.props.match.params.token,
    errorReason: '',
  };

  IsValidToken = (token: string): boolean => {
    return /^[a-z0-9]{512}$/.test(token);
  };

  ClearAndRedirect = (): void => {
    console.log('Clear and redirect');
    localStorage.clear();

    notificationsService.show('Your account has been deactivated', ToastType.Info);
    navigationService.push(AppView.Login);
  };

  confirmDeactivation = (token: string): Promise<void> => {
    console.log(token);

    return httpService
      .get<void>('/api/confirmDeactivationTeam/' + token)
      .then(() => {
        this.ClearAndRedirect();
      })
      .catch(() => {
        notificationsService.show('Invalid token', ToastType.Warning);
        navigationService.push(AppView.Login);
      });
  };

  componentDidMount(): void {
    console.log('TOKEN WEB', this.state.token);
    if (this.IsValidToken(this.state.token)) {
      this.confirmDeactivation(this.state.token);
    } else {
      notificationsService.show('Invalid token', ToastType.Warning);
      navigationService.push(AppView.Login);
    }
  }

  invalidDeactivationToken(): JSX.Element {
    return (
      <div>
        <p>Invalid token</p>
      </div>
    );
  }

  render(): ReactNode {
    return <div></div>;
  }
}

export default DeactivationTeamsView;
