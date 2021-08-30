import React from 'react';
import { connect } from 'react-redux';
import { match } from 'react-router';

import history from '../../lib/history';
import { getHeaders } from '../../lib/auth';
import i18n from '../../services/i18n.service';
import { AppDispatch } from '../../store';
import { userThunks } from '../../store/slices/user';
import notificationsService, { ToastType } from '../../services/notifications.service';

import errorService from '../../services/error.service';

interface JoinTeamProps {
  dispatch: AppDispatch;
  match: match<{ token: string }>;
}

interface JoinTeamState {
  isTeamActivated: boolean | null;
  isTeamError: boolean;
  member?: string;
  teamPassword?: string;
}

class JoinTeamView extends React.Component<JoinTeamProps, JoinTeamState> {
  constructor(props: JoinTeamProps) {
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

    fetch(`${process.env.REACT_APP_API_URL}/api/teams/join/${token}`, {
      method: 'post',
      headers: getHeaders(false, false),
      body: JSON.stringify({
        member: this.state.member,
        teamPassword: this.state.teamPassword,
      }),
    })
      .then((response) => {
        if (response.status === 200) {
          this.setState({ isTeamActivated: true });
          localStorage.setItem('teamActivation', 'true');
          notificationsService.show(i18n.get('success.joinedToTheTeam'), ToastType.Success);
          history.push('/');

          dispatch(userThunks.initializeUserThunk());
        } else {
          // Wrong activation
          this.setState({ isTeamActivated: false });
          notificationsService.show(i18n.get('error.invalidActivationCode'), ToastType.Error);
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
