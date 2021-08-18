import * as React from 'react';
import { Alert, Container } from 'react-bootstrap';
import axios from 'axios';

import history from '../../lib/history';
import { isMobile } from 'react-device-detect';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import localStorageService from '../../services/local-storage.service';

import './DeactivationView.scss';

interface DeactivationProps {
  match?: any
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
    console.log('Clear and redirect');
    localStorageService.clear();

    if (!isMobile) {
      toast.info('Your account has been deactivated');
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

export default DeactivationView;