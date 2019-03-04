import React from 'react';
import { Container } from 'react-bootstrap';
import Plans from './Plans';
import NavigationBar from './navigationBar/NavigationBar';
import PayMethods from './PayMethods';
import "./Settings.css"


class Settings extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            // First loaded, shows space usage and plans.
            // Reference to payMethodLoaded from child component to parent.
            page: <Plans planHandler={this.payMethodLoader} />
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

    componentDidMount() {

    }

    render() {
        return (
            <Container fluid className="settings">
                <NavigationBar navbarItems={<h5>Settings</h5>} showSettingsButton={true} showFileButtons={false} />
                {this.state.page}
            </Container>
        );
    }
}

export default Settings;