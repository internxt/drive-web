import React from 'react';
import { Alert, Container } from 'react-bootstrap';
import { connect } from 'react-redux';
import { isMobile } from 'react-device-detect';

import { AppDispatch } from '../../../store';
import { userThunks } from '../../../store/slices/user';

import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';

import { match } from 'react-router-dom';
import navigationService from '../../services/navigation.service';
import { AppView } from '../../types';
import { SdkFactory } from '../../factory/sdk';
import localStorageService from 'app/core/services/local-storage.service';

export interface DeactivationViewProps {
  match?: match<{ token: string }>;
  dispatch: AppDispatch;
}

class DeactivationView extends React.Component<DeactivationViewProps> {
  state = {
    token: this.props.match?.params.token || '',
    result: this.confirmDeactivation(),
    errorReason: '',
  };

  IsValidToken = (token: string) => {
    return /^[a-z0-9]{512}$/.test(token);
  };

  ClearAndRedirect = () => {
    this.props.dispatch(userThunks.logoutThunk());

    if (!isMobile) {
      notificationsService.show({ text: 'Your account has been deactivated', type: ToastType.Info });
      navigationService.push(AppView.Login);
    } else {
      this.setState({ result: this.confirmDeactivation() });
    }
  };

  ConfirmDeactivateUser = (token: string) => {
    const authClient = SdkFactory.getNewApiInstance().createAuthClient();
    const userToken = localStorageService.get('xNewToken') ?? undefined;
    return authClient
      .confirmUserDeactivation(token, userToken)
      .then(() => {
        this.ClearAndRedirect();
      })
      .catch(() => {
        if (!isMobile) {
          notificationsService.show({ text: 'Invalid token', type: ToastType.Warning });
          navigationService.push(AppView.Login);
        } else {
          this.setState({ result: this.invalidDeactivationToken() });
        }
      });
  };

  componentDidMount(): void {
    if (this.IsValidToken(this.state.token)) {
      this.ConfirmDeactivateUser(this.state.token);
    } else {
      if (!isMobile) {
        notificationsService.show({ text: 'Invalid token', type: ToastType.Warning });
        navigationService.push(AppView.Login);
      } else {
        this.setState({ result: this.invalidDeactivationToken() });
      }
    }
  }

  render(): JSX.Element {
    if (!isMobile) {
      return <div></div>;
    } else {
      return (
        <Container>
          <Alert variant="danger">{this.state.result}</Alert>
        </Container>
      );
    }
  }

  confirmDeactivation(): JSX.Element {
    return <p>Your account has been deactivated</p>;
  }

  invalidDeactivationToken(): JSX.Element {
    return (
      <div>
        <p>Invalid token</p>
      </div>
    );
  }
}

export default connect()(DeactivationView);
