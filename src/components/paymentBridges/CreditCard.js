import React from 'react';
import { Container, Form, Row, Col, Button, FormGroup } from 'react-bootstrap';
import StripeCheckout from 'react-stripe-checkout';

class CreditCard extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            stripe: null,
            onToken: (token) => {
                this.setState({
                    statusMessage: 'Purchasing...'
                });

                fetch('/buy', {
                    method: 'POST',
                    body: JSON.stringify(token),
                }).then(response => {
                    response.json().then(data => {
                        alert(`We are in business, ${data.email}`);
                    });
                });

            },
            statusMessage: ''
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
                {this.state.statusMessage}

                <StripeCheckout
                    name="Internxt SLU"
                    description="X Cloud Plan"
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