import React from 'react';
import { Container, Button } from 'react-bootstrap';
import StripeCheckout from 'react-stripe-checkout';

class CreditCard extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            stripe: null,
            plan: props.plan,
            onToken: this.onTokenHandler,
            planName: '',
            statusMessage: ''
        };

        this.state.planName = 'X Cloud ' + props.plan.name + ' Plan (€' + props.plan.price_eur + ')';
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
                plan: this.state.plan.stripe_plan_id
            })
        }).then(response => {
            return response.json();
        }).then(body => {
            this.setState({ statusMessage: body.message });
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
                    name="Internxt SL"
                    description={this.state.planName}
                    image="https://internxt.com/img/logos/internxtcircle.png"
                    currency="EUR"
                    bitcoin={false}
                    email={JSON.parse(localStorage.xUser).email}
                    stripeKey="pk_test_vpHlkSQ7DhmzSWHEbmfT1lIJ"
                    token={this.state.onToken}>

                    <Button
                        type="submit" block size="lg"
                        className="mt-4">Buy now</Button>

                </StripeCheckout>
            </Container>
        );
    }
}

export default CreditCard;