import React from 'react'
import { Spinner, Row, Button } from 'react-bootstrap';
import InxtContainerOption from './InxtContainerOption'

import iconCloseTab from '../assets/Dashboard-Icons/close-tab.svg'

import iconStripe from '../assets/PaymentBridges/stripe.svg'
import iconInxt from '../assets/PaymentBridges/inxt.svg'
import iconPayPal from '../assets/PaymentBridges/paypal.svg'

const stripeGlobal = window.Stripe;

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

            productsLoading: true,
            plansLoading: true,

            availableProducts: null,
            availablePlans: null,

            selectedProductToBuy: null,
            selectedPlanToBuy: null,

            paymentMethod: null
        }
    }

    setHeaders = () => {
        let headers = {
            Authorization: `Bearer ${localStorage.getItem("xToken")}`,
            "content-type": "application/json; charset=utf-8",
            "internxt-mnemonic": localStorage.getItem("xMnemonic")
        };
        return headers;
    }


    loadAvailableProducts() {
        const freePlan = {
            id: null,
            metadata: {
                simple_name: '1GB',
                price_eur: '0.00',
                size_bytes: 1073741824
            }
        };


        fetch('/api/stripe/products', {
            headers: { 'content-type': 'application/json' }
        }).then(response => response.json()).then(products => {
            this.setState({
                availableProducts: [freePlan, ...products],
                productsLoading: false
            });
        }).catch(err => {

        });
    }

    loadAvailablePlans() {
        fetch('/api/stripe/plans', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ product: this.state.selectedProductToBuy.id })
        }).then(result => result.json()).then(result => {
            this.setState({ availablePlans: result, plansLoading: false });
        }).catch(err => {
            console.log('Error loading price plans', err.message);
        });
    }

    componentDidMount() {
        this.loadAvailableProducts();
    }


    handleStripePayment() {
        this.setState({ statusMessage: 'Purchasing...' });

        const stripe = new stripeGlobal(process.env.REACT_APP_STRIPE_PK);

        fetch('/api/stripe/session', {
            method: 'POST',
            headers: this.setHeaders(),
            body: JSON.stringify({ plan: this.state.selectedPlanToBuy.id })
        }).then(result => result.json()).then(result => {
            if (result.error) {
                throw Error(result.error);
            }

            this.setState({ statusMessage: 'Redirecting to Stripe...' });

            stripe.redirectToCheckout({ sessionId: result.id }).then(result => {
                console.log(result);
            }).catch(err => {
                this.setState({ statusMessage: 'Failed to redirect to Stripe. Reason:' + err.message });
            });
        }).catch(err => {
            console.error('Error starting Stripe session. Reason: %s', err);
            this.setState({ statusMessage: 'Error purchasing. Reason: ' + err.message });
        });
    }

    render() {
        if (this.state.storageStep === 1) {
            return (<div>
                <p className="title1">Storage Plans</p>

                {this.state.productsLoading === true ? <div style={{ textAlign: 'center' }}>
                    <Spinner animation="border" size="sm" />
                </div> : ''}
                {this.state.productsLoading === 'error' ? 'There was an error loading the available plans: The server was unreachable. Please check your network connection and reload.' : ''}

                <Row className='mt-4'>
                    {this.state.availableProducts ?
                        this.state.availableProducts.map((entry, i) => {
                            // Print the list of available products
                            return <InxtContainerOption
                                key={'plan' + i}
                                isChecked={this.props.currentPlan === entry.metadata.size_bytes * 1}
                                header={entry.metadata.simple_name}
                                onClick={(e) => {
                                    // Can't select the current product or lesser
                                    if (this.props.currentPlan > entry.metadata.size_bytes * 1) {
                                        return false;
                                    }
                                    this.setState({ selectedProductToBuy: entry, storageStep: 2, plansLoading: true, availablePlans: null });
                                }}
                                text={entry.metadata.price_eur === '0.00' ? 'Free' : <span>€{entry.metadata.price_eur}<span style={{ color: '#7e848c', fontWeight: 'normal' }}>/month</span></span>} />
                        })
                        : ''}
                </Row>
            </div>);
        }

        if (this.state.storageStep === 2) {
            if (this.state.availablePlans == null) {
                this.loadAvailablePlans();
            }
            return <div>
                <p className="close-modal" onClick={e => this.setState({ storageStep: 1 })}><img src={iconCloseTab} alt="Close" /></p>
                <p className="title1">Select payment length <span style={{ fontWeight: 'normal', color: '#7e848c' }}>| {this.state.selectedProductToBuy.metadata.simple_name} Plan</span></p>

                {this.state.plansLoading === true ? <div style={{ textAlign: 'center' }}>
                    <Spinner animation="border" size="sm" />
                </div> : ''}
                {this.state.plansLoading === 'error' ? 'There was an error loading the available plans: The server was unreachable. Please check your network connection and reload.' : ''}


                <Row className='mt-4'>
                    {this.state.availablePlans ?
                        this.state.availablePlans.map((entry, i) => {
                            // Convert to months
                            if (entry.interval === 'year') {
                                entry.interval_count *= 12;
                                entry.interval = 'month';
                            }

                            // Print the list of available plans
                            return <InxtContainerOption
                                key={'plan' + i}
                                isChecked={false}
                                header={'€' + (entry.price / 100) / entry.interval_count}
                                onClick={(e) => {
                                    this.setState({ selectedPlanToBuy: entry, storageStep: 3 });
                                }}
                                text={<span><span style={{ color: '#7e848c', fontWeight: 'normal' }}>Prepay{entry.interval_count === 1 ? ' per' : ''}</span>&nbsp;{entry.interval_count !== 1 ? entry.interval_count + ' ' : ''}month{entry.interval_count > 1 ? 's' : ''}</span>} />
                        })
                        : ''}
                </Row>
            </div>;
        }

        if (this.state.storageStep === 3) {
            return <div>
                <p className="close-modal" onClick={e => this.setState({ storageStep: 2 })}><img src={iconCloseTab} alt="Close" /></p>
                <p className="title1">Select payment <span style={{ fontWeight: 'normal', color: '#7e848c' }}>| {this.state.selectedProductToBuy.metadata.simple_name} Plan, {this.state.selectedPlanToBuy.name}</span></p>

                <Row className='mt-4'>
                    {
                        PaymentBridges.map((entry, i) => {
                            return <InxtContainerOption
                                key={'bridge' + i}
                                style={entry.border}
                                header={<img src={entry.logo} alt="Logo" />}
                                text={entry.name}
                                onClick={e => {
                                    this.setState({ storageStep: 4, paymentMethod: entry.name });
                                }}
                            />
                        })
                    }
                </Row>
            </div>;
        }

        if (this.state.storageStep === 4) {
            return <div>
                <p className="close-modal" onClick={e => this.setState({ storageStep: 3 })}><img src={iconCloseTab} alt="Close" /></p>
                <p className="title1">Order summary <span style={{ fontWeight: 'normal', color: '#7e848c' }}>| {this.state.selectedProductToBuy.metadata.simple_name} Plan, {this.state.selectedPlanToBuy.name}, {this.state.paymentMethod}</span></p>

                <div>
                    {this.state.paymentMethod === 'Card' ? <div style={{ textAlign: 'center' }}>
                        <Button
                            type="submit"
                            size="sm"
                            onClick={this.handleStripePayment.bind(this)}
                            style={{
                                width: '28%',
                                height: '40px',
                                background: 'linear-gradient(74deg, #096dff, #00b1ff)',
                                borderWidth: '0px'
                            }}>Buy now</Button>

                    </div>
                        : <div style={{ textAlign: 'center' }}>Comming soon...</div>}
                    <p className="mt-4" style={{ textAlign: 'center', fontSize: 14 }}>{this.state.statusMessage}</p>
                </div>
            </div>;
        }
    }
}

export default StoragePlans;
