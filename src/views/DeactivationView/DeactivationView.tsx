import * as React from 'react';
import { Alert, Container } from 'react-bootstrap';
import axios from 'axios';
import { connect } from 'react-redux';
import 'react-toastify/dist/ReactToastify.css';
import { isMobile } from 'react-device-detect';
import { toast } from 'react-toastify';

import history from '../../lib/history';
import { AppDispatch } from '../../store';
import { userThunks } from '../../store/slices/user';

import './DeactivationView.scss';
import notificationsService, { ToastType } from '../../services/notifications.service';
interface DeactivationProps {
  match?: any;
  dispatch: AppDispatch;
}

class DeactivationView extends React.Component<DeactivationProps> {
  state = {
    token: this.props.match.params.token,
    result: this.confirmDeactivation(),
    errorReason: ''
  }

  IsValidToken = (token: string) => {
    return /^[a-z0-9]{512}$/.test(token);
  }

  ClearAndRedirect = () => {
    this.props.dispatch(userThunks.logoutThunk());

    if (!isMobile) {
      notificationsService.show('Your account has been deactivated', ToastType.Info);
      history.push('/');
    } else {
      this.setState({ result: this.confirmDeactivation() });
    }
  }

  ConfirmDeactivateUser = (token: string) => {
    axios.get('/api/confirmDeactivation/' + token).then(res => {
      this.ClearAndRedirect();
    }).catch(err => {
      if (!isMobile) {
        toast.warn('Invalid token');
        history.push('/');
      } else {
        this.setState({ result: this.invalidDeactivationToken() });
      }
    });
  }

  componentDidMount(): void {
    if (this.IsValidToken(this.state.token)) {
      this.ConfirmDeactivateUser(this.state.token);
    } else {

      if (!isMobile) {
        toast.warn('Invalid token');
        history.push('/');
      } else {
        this.setState({ result: this.invalidDeactivationToken() });
      }
    }
  }

  render(): JSX.Element {
    if (!isMobile) {
      return <div></div>;
    } else {
      return <Container>
        <Alert variant="danger">{this.state.result}</Alert>
      </Container>;
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
}

export default connect()(DeactivationView);