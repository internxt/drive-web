import React from 'react';
import { Container, Form, Row, Col, Button, FormGroup } from 'react-bootstrap';
import StripeCheckout from 'react-stripe-checkout';

class CreditCard extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            stripe: null,
            onToken: (token) => {
                // Purchase request recieved from Stripe Checkout
                let checkoutInfo = JSON.stringify(token);

                let stripePay = require('./StripePayment');

                console.log(stripePay);

            }
        };
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
                <StripeCheckout
                    name="Internxt SLU"
                    description="X Cloud Plan"
                    image="https://internxt.com/img/logos/internxtcircle.png"
                    currency="EUR"

                    bitcoin={false}

                    stripeKey=""
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