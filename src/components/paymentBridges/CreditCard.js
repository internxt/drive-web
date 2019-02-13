import React from 'react';
import { Container, Form, Row, Col, Button, FormGroup } from 'react-bootstrap';
import StripeCheckout from 'react-stripe-checkout';

const PlanNames = [
    {
        name: 'X Cloud Plan (€4.49)',
        code: 'plan_EUaU5KuX0bbmMZ'
    },
    {
        name: 'X Cloud Plan (€9.45)',
        code: 'plan_EUaULpk2iX6695'
    },
];

class CreditCard extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            stripe: null,
            stripePlan: props.plan,
            onToken: this.onTokenHandler,
            planName: PlanNames.find(f => f.code == props.plan).name,
            statusMessage: '',
            testFunction: this.testFunction
        };
    }

    onTokenHandler = (token) => {
        this.setState({
            statusMessage: 'Purchasing...'
        });

        fetch('/api/buy', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                token: JSON.stringify(token),
                plan: this.state.stripePlan
            })
        }).then(response => {

            console.log('Respuesta');

            /*
            response.json().then(data => {
                alert(`We are in business, ${data.email}`);
            });
            */
        });
    }

    componentDidMount() {
    }

    submit(event) {
        event.preventDefault();
    }
    //               
    render() {
        return (
            <Container>
                {this.state.statusMessage}

                <StripeCheckout
                    name="Internxt SLU"
                    description={this.state.planName}
                    image="https://internxt.com/img/logos/internxtcircle.png"
                    currency="EUR"

                    bitcoin={false}

                    stripeKey="pk_test_wmWArhhCKGZWNPUF8z38Eupd"
                    token={this.state.onToken}>
                    <Button
                        variant="primary" type="submit" block size="lg"
                        className="mt-4">Buy now</Button>

                </StripeCheckout>
            </Container>
        );
    }
}

export default CreditCard;