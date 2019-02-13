import React from 'react';
import { Container } from 'react-bootstrap';
import Plans from './Plans';
import NavigationBar from './navigationBar/NavigationBar';
import PayMethods from './PayMethods';


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
        if (plan.stripePlan != null) {
            this.setState({
                page: <PayMethods choosedPlan={plan} />
            });
        }
    }

    componentDidMount() {

    }

    render() {
        return (
            <Container fluid>
                <NavigationBar navbarItems={<h3>Settings</h3>} />

                {this.state.page}
            </Container>
        );
    }
}

export default Settings;