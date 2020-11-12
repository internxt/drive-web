import React from 'react';

interface props {
    match?: any
}
interface state {
    sessionId: any
}

class Checkout extends React.Component<props, state> {
    constructor(props: props) {
        super(props);

        this.state = {
            sessionId: this.props.match.params.sessionId
        };
    }

    checkSessionId(sessionId) {
        const pattern = /^cs_(test|live)_[a-zA-Z0-9]+$/
        return pattern.exec(sessionId)
    }

    componentWillMount() {
        if (this.checkSessionId(this.state.sessionId)) {
            if (this.state.sessionId) {
                const stripe = new window.Stripe(process.env.NODE_ENV !== 'production' ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK);

                stripe.redirectToCheckout({ sessionId: this.state.sessionId }).then(result => {
                    console.log(result);
                }).catch(err => {
                    console.log(err);
                });
            }
        }
    }

    render() {
        if (!this.checkSessionId(this.state.sessionId)) {
            if (this.state.sessionId === 'ok' || this.state.sessionId === 'cancel') {
                return <div>{this.state.sessionId}</div>
            } else {
                return <div>Invalid session</div>
            }
        }
        return <div></div>;
    }
}

export default Checkout;