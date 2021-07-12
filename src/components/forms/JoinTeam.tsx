import React from 'react';
import history from '../../lib/history';
import { getHeaders } from '../../lib/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Login.scss';
import './Reset.scss';

interface Props {
  match: any
}

interface State {
  isTeamActivated: boolean | null
  isTeamError: boolean
  member?: string,
  teamPassword?: string
}

class JoinTeam extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isTeamActivated: null,
      isTeamError: false,
      member: '',
      teamPassword: ''

    };
    this.redirect = this.redirect.bind(this);

  }

  componentDidMount() {
    this.joinToTheTeam(this.props.match.params.token);
  }

  joinToTheTeam(token) {

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
        toast.info('You have successfully joined to the team, please login');
        history.push('/');
      } else {
        // Wrong activation
        this.setState({ isTeamActivated: false });
        toast.warn('Your activation code is invalid. Maybe you have used this link before and your account is already activated.');
      }

    }).catch(error => {
      this.setState({ isTeamActivated: false });
    });
  }

  redirect = () => {
    if (this.state.isTeamActivated) {
      toast.info('You have successfully joined to the team, please login', { className: 'xcloud-toast-info' });
    } else {
      toast.warn('Your activation code is invalid. Maybe you have used this link before and your account is already activated.');
    }
    history.push('/');
  }

  render() {
    return (<div />);
  }
}

export default JoinTeam;