import * as React from "react";
import { Alert, Container } from 'react-bootstrap';
import axios from 'axios';

class Deactivation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            token: this.props.match.params.token,
            result: this.confirmDeactivation(),
            errorReason: ''
        }
    }

    IsValidToken = (token) => {
        return /^[a-z0-9]{512}$/.test(token);
    }

    ClearAndRedirect = () => {
        console.log('Clear and redirect')
        localStorage.clear();
        this.setState({ result: this.confirmDeactivation() });
    }


    ConfirmDeactivateUser = (token) => {
        axios.get('/api/confirmDeactivation/' + token).then(res => {
            console.log('All is ok')
            this.ClearAndRedirect()
        }).catch(err => {
            console.log('GET ERROR', err);
            this.setState({
                result: this.invalidDeactivationToken()
            });
        });
    }


    componentDidMount() {
        if (this.IsValidToken(this.state.token)) {
            this.ConfirmDeactivateUser(this.state.token);
        } else {
            this.setState({ result: this.invalidDeactivationToken() });
        }
    }

    render() {
        return <Container>
            <Alert variant="danger">
                {this.state.result}
            </Alert>
        </Container>;
    }

    confirmDeactivation() {
        return <p>Your account has been deactivated</p>
    }

    invalidDeactivationToken() {
        return <div>
            <p>Invalid token</p>
        </div>;
    }
}

export default Deactivation;