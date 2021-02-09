import * as React from "react";
import axios from 'axios';
import history from '../../lib/history';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface DeactivationTeamsProps {
    match: any
}

class DeactivationTeams extends React.Component<DeactivationTeamsProps> {
    state = {
        token: this.props.match.params.token,
        result: this.confirmDeactivation(),
        errorReason: ''
    }

    IsValidToken = (token: string) => {
        return /^[a-z0-9]{512}$/.test(token);
    }

    ClearAndRedirect = () => {
        console.log('Clear and redirect')
        localStorage.clear();


        toast.info('Your account has been deactivated');
        history.push('/');

    }


    ConfirmDeactivateTeam = (token: string) => {
        console.log(token)
        axios.get('/api/confirmDeactivationTeam/' + token).then(res => {
            console.log('All is ok')
            this.ClearAndRedirect()
        }).catch(err => {
            console.log('GET ERROR', err);


            toast.warn('Invalid token');
            history.push('/');

        });
    }


    componentDidMount() {
        console.log('TOKEN WEB',this.state.token)
        if (this.IsValidToken(this.state.token)) {
            this.ConfirmDeactivateTeam(this.state.token);
        } else {


            toast.warn('Invalid token');
            history.push('/');

        }
    }

    render() {

        
            return "";
        
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

export default DeactivationTeams;