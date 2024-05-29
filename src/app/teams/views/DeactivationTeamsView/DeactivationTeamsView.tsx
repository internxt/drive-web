import { Component, ReactNode } from 'react';
import { match } from 'react-router';
import { AppView } from '../../../core/types';

import httpService from '../../../core/services/http.service';
import navigationService from '../../../core/services/navigation.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';

export interface DeactivationTeamsViewProps {
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

    notificationsService.show({ text: 'Your account has been deactivated', type: ToastType.Info });
    navigationService.push(AppView.Login);
  };

  confirmDeactivation = (token: string): Promise<void> => {
    console.log(token);

    return httpService
      .get<void>('/confirmDeactivationTeam/' + token)
      .then(() => {
        this.ClearAndRedirect();
      })
      .catch(() => {
        notificationsService.show({ text: 'Invalid token', type: ToastType.Warning });
        navigationService.push(AppView.Login);
      });
  };

  componentDidMount(): void {
    console.log('TOKEN WEB', this.state.token);
    if (this.IsValidToken(this.state.token)) {
      this.confirmDeactivation(this.state.token);
    } else {
      notificationsService.show({ text: 'Invalid token', type: ToastType.Warning });
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
