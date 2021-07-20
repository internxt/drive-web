import React, { ReactNode } from 'react';

interface CheckoutViewProps {
    match?: any
}
interface CheckoutViewState {
    sessionId: any
}

class CheckoutView extends React.Component<CheckoutViewProps, CheckoutViewState> {
  constructor(props: CheckoutViewProps) {
    super(props);

    this.state = {
      sessionId: this.props.match.params.sessionId
    };
  }

  checkSessionId(sessionId): RegExpExecArray | null {
    const pattern = /^cs_(test|live)_[a-zA-Z0-9]+$/;

    return pattern.exec(sessionId);
  }

  componentWillMount(): void {
    const match = this.checkSessionId(this.state.sessionId);

    if (match) {
      if (this.state.sessionId) {
        const stripe = new window.Stripe(match[1] === 'test' ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK);

        stripe.redirectToCheckout({ sessionId: this.state.sessionId }).then(result => {
          console.log(result);
        }).catch(err => {
          console.log(err);
        });
      }
    }
  }

  render(): JSX.Element {
    if (!this.checkSessionId(this.state.sessionId)) {
      if (this.state.sessionId === 'ok' || this.state.sessionId === 'cancel') {
        return <div>{this.state.sessionId}</div>;
      } else {
        return <div>Invalid session</div>;
      }
    }
    return <div></div>;
  }
}

export default CheckoutView;