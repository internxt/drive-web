import React from 'react';
import { Container } from 'react-bootstrap';
import Plans from './Plans';
import NavigationBar from './navigationBar/NavigationBar';
import PayMethods from './PayMethods';
import "./Storage.css";
import history from '../history';


class Storage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            page: null
        }

    }

    componentDidMount() {
        // Check auth and redirect to login if necessary
        if (!this.props.isAuthenticated) {
            history.push('/login');
        } else {
            // First loaded, shows space usage and plans.
            // Reference to payMethodLoaded from child component to parent.
            this.setState({
                page: <Plans planHandler={this.payMethodLoader} />
            });
        }
    }

    payMethodLoader = (plan) => {
        console.log(plan);
        if (plan.stripe_plan_id != null) {
            this.setState({
                page: <PayMethods choosedPlan={plan} />
            });
        }
    }

    render() {
        return (
            <Container fluid className="settings">
                <NavigationBar navbarItems={<h5>Storage</h5>} showSettingsButton={true} showFileButtons={false} />
                {this.state.page}
            </Container>
        );
    }
}

export default Storage;