import React from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import history from '../../lib/history';
import { getHeaders } from '../../lib/auth';

import './JoinTeamView.scss';
import notify, { ToastType } from '../../components/Notifications';
import i18n from '../../services/i18n.service';

interface JoinTeamProps {
  match: any
}

interface JoinTeamState {
  isTeamActivated: boolean | null
  isTeamError: boolean
  member?: string,
  teamPassword?: string
}

class JoinTeamView extends React.Component<JoinTeamProps, JoinTeamState> {
  constructor(props: JoinTeamProps) {
    super(props);
    this.state = {
      isTeamActivated: null,
      isTeamError: false,
      member: '',
      teamPassword: ''

    };
    this.redirect = this.redirect.bind(this);

  }

  componentDidMount(): void {
    this.joinToTheTeam(this.props.match.params.token);
  }

  joinToTheTeam(token): void {

    fetch(`/api/teams/join/${token}`, {
      method: 'post',
      headers: getHeaders(false, false),
      body: JSON.stringify({
        member: this.state.member,
        teamPassword: this.state.teamPassword
      })
    }).then(response => {
      if (response.status === 200) {
        this.setState({ isTeamActivated: true });
        localStorage.setItem('teamActivation', 'true');
        notify(i18n.get('success.joinedToTheTeam'), ToastType.Success);
        history.push('/');
      } else {
        // Wrong activation
        this.setState({ isTeamActivated: false });
        notify(i18n.get('error.invalidActivationCode'), ToastType.Error);
      }

    }).catch(error => {
      this.setState({ isTeamActivated: false });
    });
  }

  redirect = (): void => {
    if (this.state.isTeamActivated) {
      notify(i18n.get('success.joinedToTheTeam'), ToastType.Success);
    } else {
      notify(i18n.get('error.invalidActivationCode'), ToastType.Warning);
    }
    history.push('/');
  }

  render(): JSX.Element {
    return (<div />);
  }
}

export default JoinTeamView;