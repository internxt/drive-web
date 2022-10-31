import React from 'react';
import { connect } from 'react-redux';
import { match } from 'react-router';

import i18n from '../../../i18n/services/i18n.service';
import { AppDispatch } from '../../../store';
import { userThunks } from '../../../store/slices/user';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';

import errorService from '../../../core/services/error.service';
import navigationService from '../../../core/services/navigation.service';
import httpService from '../../../core/services/http.service';
import { AppView } from '../../../core/types';
import EnvService from 'app/core/services/dynamicEnv.service';

export interface JoinTeamViewProps {
  dispatch: AppDispatch;
  match: match<{ token: string }>;
}

interface JoinTeamViewState {
  isTeamActivated: boolean | null;
  isTeamError: boolean;
  member?: string;
  teamPassword?: string;
}

class JoinTeamView extends React.Component<JoinTeamViewProps, JoinTeamViewState> {
  constructor(props: JoinTeamViewProps) {
    super(props);
    this.state = {
      isTeamActivated: null,
      isTeamError: false,
      member: '',
      teamPassword: '',
    };
  }

  componentDidMount(): void {
    this.joinToTheTeam(this.props.match.params.token);
  }

  joinToTheTeam = (token): void => {
    const { dispatch } = this.props;

    fetch(`${EnvService.selectedEnv.REACT_APP_API_URL}/api/teams/join/${token}`, {
      method: 'post',
      headers: httpService.getHeaders(false, false),
      body: JSON.stringify({
        member: this.state.member,
        teamPassword: this.state.teamPassword,
      }),
    })
      .then((response) => {
        if (response.status === 200) {
          this.setState({ isTeamActivated: true });
          localStorage.setItem('teamActivation', 'true');
          notificationsService.show({ text: i18n.get('success.joinedToTheTeam'), type: ToastType.Success });
          navigationService.push(AppView.Login);

          dispatch(userThunks.initializeUserThunk());
        } else {
          // Wrong activation
          this.setState({ isTeamActivated: false });
          notificationsService.show({ text: i18n.get('error.invalidActivationCode'), type: ToastType.Error });
        }
      })
      .catch((err: unknown) => {
        const castedError = errorService.castError(err);

        console.error(castedError.message);
        this.setState({ isTeamActivated: false });
      });
  };

  render(): JSX.Element {
    return <div />;
  }
}

export default connect()(JoinTeamView);
