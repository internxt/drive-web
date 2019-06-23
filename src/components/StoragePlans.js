import React from 'react'
import { Spinner, Row, Button } from 'react-bootstrap';
import InxtContainerOption from './InxtContainerOption'

import iconCloseTab from '../assets/Dashboard-Icons/close-tab.svg'

import iconStripe from '../assets/PaymentBridges/stripe.svg'
import iconInxt from '../assets/PaymentBridges/inxt.svg'
import iconPayPal from '../assets/PaymentBridges/paypal.svg'

import StripeCheckout from 'react-stripe-checkout'

const PaymentBridges = [
    {
        name: 'Card',
        logo: iconStripe,
        border: 'linear-gradient(88deg, #ea001b, #f7a934)'
    },
    {
        name: 'PayPal',
        logo: iconPayPal,
        border: 'linear-gradient(88deg, #003087, #009cde)'
    },
    {
        name: 'INXT',
        logo: iconInxt,
        border: 'linear-gradient(88deg, #000000, #686868)'
    }
]

class StoragePlans extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            statusMessage: '',
            storageStep: 1,

            plansLoading: true,
            availablePlans: null,
            selectedPlanToBuy: null,

            paymentMethod: null
        }
    }

    loadAvailablePlans() {
        fetch('/api/plans', { method: 'post' })
            .then(response => response.json())
            .then(pay => {
                this.setState({
                    availablePlans: pay,
                    plansLoading: false
                });
            }).catch(err => {
                console.log('Error loading plans: ', err);
                this.setState({ plansLoading: 'error' });
            });
    }

    componentDidMount() {
        this.loadAvailablePlans();
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
                plan: this.state.selectedPlanToBuy.stripe_plan_id
            })
        }).then(response => response.json()).then(body => {
            this.setState({ statusMessage: body.message });
        }).catch(err => {
            console.log(err);
            this.setState({ statusMessage: 'Error purchasing' });
        });
    }

    render() {
        if (this.state.storageStep == 1) {
            return <div>
                <p className="title">Storage Plans</p>

                {this.state.plansLoading == true ? <Spinner animation="border" size="sm" /> : ''}
                {this.state.plansLoading == 'error' ? 'There was an error loading the available plans: The server was unreachable. Please check your network connection and reload.' : ''}

                <Row className='mt-4'>
                    {this.state.availablePlans ?
                        this.state.availablePlans.map((entry, i) => {
                            // Print the list of available plans
                            return <InxtContainerOption
                                key={'plan' + i}
                                isChecked={this.props.currentPlan == entry.space_gb * 1073741824}
                                header={entry.name}
                                onClick={(e) => {
                                    // Can't select the current plan or lesser
                                    if (this.props.currentPlan >= entry.space_gb * 1073741824) {
                                        return false;
                                    }
                                    this.setState({ selectedPlanToBuy: entry, storageStep: 3 });
                                }}
                                text={entry.price_eur == '0.00' ? 'Free' : <span>€{entry.price_eur}<span style={{ color: '#7e848c', fontWeight: 'normal' }}>/month</span></span>} />
                        })
                        : ''}
                </Row>
            </div>;
        }
        if (this.state.storageStep == 2) {
            return <div>
                <p className="close-modal" onClick={e => this.setState({ storageStep: 1 })}><img src={iconCloseTab} /></p>
                <p className="title">Select payment length | 1TB plan</p>
            </div>;
        }
        if (this.state.storageStep == 3) {
            return <div>
                <p className="close-modal" onClick={e => this.setState({ storageStep: 1 })}><img src={iconCloseTab} /></p>
                <p className="title">Select payment <span style={{ fontWeight: 'normal', color: '#7e848c' }}>| {this.state.selectedPlanToBuy.name} Plan, every month</span></p>

                <Row className='mt-4'>
                    {
                        PaymentBridges.map((entry, i) => {
                            return <InxtContainerOption
                                key={'bridge' + i}
                                style={entry.border}
                                header={<img src={entry.logo} />}
                                text={entry.name}
                                onClick={e => {
                                    this.setState({
                                        storageStep: 4,
                                        paymentMethod: entry.name
                                    });
                                }}
                            />
                        })
                    }
                </Row>
            </div>;
        }

        if (this.state.storageStep == 4) {
            const selectedPlan = this.state.selectedPlanToBuy;
            const planName = 'X Cloud ' + selectedPlan.name + ' Plan (€' + selectedPlan.price_eur + ')';
            return <div>
                <p className="close-modal" onClick={e => this.setState({ storageStep: 3 })}><img src={iconCloseTab} /></p>
                <p className="title">Select payment <span style={{ fontWeight: 'normal', color: '#7e848c' }}>| {this.state.selectedPlanToBuy.name} Plan, every month, {this.state.paymentMethod}</span></p>

                <div>
                    {this.state.paymentMethod === 'Card' ? <StripeCheckout
                        name="Internxt SL"
                        description={planName}
                        image="https://internxt.com/img/logos/internxtcircle.png"
                        currency="EUR"
                        bitcoin={false}
                        email={JSON.parse(localStorage.xUser).email}
                        stripeKey={process.env.REACT_APP_STRIPE_PK}
                        token={this.onTokenHandler}
                        billingAddress={true}
                        zipCode={true}>

                        <div style={{ textAlign: 'center' }}>
                            <Button
                                type="submit"
                                size="sm"
                                style={{
                                    width: '28%',
                                    height: '40px',
                                    background: 'linear-gradient(74deg, #096dff, #00b1ff)',
                                    borderWidth: '0px'
                                }}>Buy now</Button>

                        </div>

                    </StripeCheckout>
                        : <div style={{ textAlign: 'center' }}>Comming soon...</div>}
                    <p className="mt-4" style={{textAlign: 'center', fontSize: 14}}>{this.state.statusMessage}</p>
                </div>
            </div>;
        }
    }
}

export default StoragePlans;
