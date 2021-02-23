import React, { useEffect, useState } from 'react';
import { Spinner, Row, Button } from 'react-bootstrap';
import InxtContainerOption from './InxtContainerOption';
import iconCloseTab from '../assets/Dashboard-Icons/close-tab.svg';
import iconStripe from '../assets/PaymentBridges/stripe.svg';
import { getHeaders } from '../lib/auth';
import { encryptPGP } from '../lib/utilspgp';
import { TextField } from '@material-ui/core';
import { generateMnemonic } from 'bip39';

const stripeGlobal = window.Stripe;

const PaymentBridges = [
  {
    name: 'Card',
    logo: iconStripe,
    border: 'linear-gradient(88deg, #ea001b, #f7a934)'
  }
];

export default function TeamPlans(props: any) {
  const [statusMessage, setStatusMessage] = useState('');
  const [storageStep, setStorageStep] = useState(1);
  const [productsLoading, setProductsLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availablePlans, setAvailablePlans] = useState();
  const [selectedProductToBuy, setSelectedProductToBuy] = useState();
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState();
  const [paymentMethod, setPaymentMethod] = useState();
  const [totalTeamMembers, setTotalTeamMembers] = useState(2);

  function loadAvailableProducts() {
    return fetch('/api/stripe/teams/products' + (process.env.NODE_ENV !== 'production' ? '?test=true' : ''), {
      headers: getHeaders(true, false)
    }).then(response => response.json()).then(products => {
      setAvailableProducts(products);
      setProductsLoading(false);
    });
  }

  function loadAvailablePlans() {
    const body = {
      product: selectedProductToBuy.id,
      test: process.env.NODE_ENV !== 'production'
    };

    return fetch('/api/stripe/teams/plans', {
      method: 'post',
      headers: getHeaders(true, false),
      body: JSON.stringify(body)
    }).then(result => result.json()).then(result => {
      setAvailablePlans(result);
      setPlansLoading(false);
    });
  }

  useEffect(() => {
    loadAvailableProducts();
  }, []);

  async function handleStripePayment(e) {
    e.preventDefault();
    setStatusMessage('Purchasing...');
    const mnemonicTeam = generateMnemonic(256);
    const encMnemonicTeam = await encryptPGP(mnemonicTeam);

    const codMnemonicTeam = Buffer.from(encMnemonicTeam.data).toString('base64');
    const stripe = new stripeGlobal(process.env.NODE_ENV !== 'production' ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK);
    const body = {
      plan: selectedPlanToBuy.id,
      sessionType: 'team',
      quantity: totalTeamMembers,
      mnemonicTeam: codMnemonicTeam,
      test: process.env.NODE_ENV !== 'production'
    };

    fetch('/api/stripe/teams/session', {
      method: 'POST',
      headers: getHeaders(true, false),
      body: JSON.stringify(body)
    }).then(result => result.json()).then(result => {
      if (result.error) { throw Error(result.error); }

      setStatusMessage('Redirecting to Stripe...');

      stripe.redirectToCheckout({ sessionId: result.id }).catch(err => {
        setStatusMessage('Failed to redirect to Stripe. Reason:' + err.message);
      });
    }).catch(err => {
      console.error('Error starting Stripe session. Reason: %s', err);
      setStatusMessage('Please contact us. Reason: ' + err.message);
    });
  }

  if (storageStep === 1) {
    return <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p className="title1">Team Plans</p>
      </div>

      {productsLoading === true ? <div style={{ textAlign: 'center' }}>
        <Spinner animation="border" size="sm" />
      </div> : ''}
      {productsLoading === 'error' ? 'There was an error loading the available plans: The server was unreachable. Please check your network connection and reload.' : ''}
      <Row className='mt-0'>

        {availableProducts ?
          availableProducts.map((entry, i) => {
            // Print the list of available products
            return <InxtContainerOption
              key={'plan' + i}
              isChecked={props.currentPlan === entry.metadata.team_size_bytes * 1}
              header={entry.metadata.simple_name}
              onClick={(e) => {
                // Can't select the current product or lesser
                setSelectedProductToBuy(entry);
                setStorageStep(2);
                setPlansLoading(true);
                setAvailablePlans(null);
              }}
              handleShowDescription={props.handleShowDescription}
              text={entry.metadata.price_eur === '0.00' ? 'Free'
                :
                <span>
                  <span style={{ display: 'block' }}>{entry.metadata.team_members !== 'unlimited' ? `Up to ${entry.metadata.team_members} members` : 'Unlimited'}</span>
                  <span style={{ display: 'block' }}>€{entry.metadata.price_eur}<span style={{ textAlign: 'center', color: '#7e848c', fontWeight: 'normal' }}>/month</span></span>
                </span>
              } />;
          }) : ''}

      </Row>
    </div>;
  }

  if (storageStep === 2) {
    if (availablePlans == null) {
      loadAvailablePlans();
    }
    return <div>
      <p className="close-modal" onClick={e => setStorageStep(1)}><img src={iconCloseTab} alt="Close" /></p>
      <p className="title1">Select payment length <span style={{ fontWeight: 'normal', color: '#7e848c' }}>| {selectedProductToBuy.metadata.simple_name} Plan</span></p>

      {plansLoading === true ? <div style={{ textAlign: 'center' }}>
        <Spinner animation="border" size="sm" />
      </div> : ''}
      {plansLoading === 'error' ? 'There was an error loading the available plans: The server was unreachable. Please check your network connection and reload.' : ''}

      <Row className='mt-4'>
        {availablePlans ?
          availablePlans.map((entry, i) => {
            // Convert to months
            if (entry.interval === 'year') {
              entry.interval_count *= 12;
              entry.interval = 'month';
            }

            const fixedPrice = ((entry.price / 100) / entry.interval_count).toFixed(2);

            // Print the list of available plans
            return <InxtContainerOption
              key={'plan' + i}
              isChecked={false}
              header={'€' + fixedPrice}
              onClick={(e) => {
                setSelectedPlanToBuy(entry);
                setStorageStep(4);
                setPaymentMethod(PaymentBridges[0].name);
              }}
              text={<span><span style={{ color: '#7e848c', fontWeight: 'normal' }}>Prepay{entry.interval_count === 1 ? ' per' : ''}</span>&nbsp;{entry.interval_count !== 1 ? entry.interval_count + ' ' : ''}month{entry.interval_count > 1 ? 's' : ''}</span>} />;
          })
          : ''}
      </Row>
    </div>;
  }

  if (storageStep === 3) {
    return <div>
      <p className="close-modal" onClick={e => setStorageStep(2)}><img src={iconCloseTab} alt="Close" /></p>
      <p className="title1">Select payment <span style={{ fontWeight: 'normal', color: '#7e848c' }}>| {selectedProductToBuy.metadata.simple_name} Plan, {selectedPlanToBuy.name}</span></p>

      <Row className='mt-4'>
        {
          PaymentBridges.map((entry, i) => {
            return <InxtContainerOption
              key={'bridge' + i}
              style={entry.border}
              header={<img src={entry.logo} alt="Logo" />}
              text={entry.name}
              onClick={e => {
                setStorageStep(4);
                setPaymentMethod(entry.name);
              }}
            />;
          })
        }
      </Row>
    </div>;
  }

  if (storageStep === 4) {
    return <div>
      <p className="close-modal" onClick={e => setStorageStep(2)}><img src={iconCloseTab} alt="Close" /></p>
      <p className="title1">Order summary <span style={{ fontWeight: 'normal', color: '#7e848c' }}>| {selectedProductToBuy.metadata.simple_name} Plan, {selectedPlanToBuy.name}, {paymentMethod}</span></p>

      <div>
        {paymentMethod === 'Card' ? <div style={{ textAlign: 'center' }}>

          <p>
            <TextField
              type="number" variant="outlined" label="Team members"
              style={{ width: 154 }}
              InputProps={{
                required: true,
                inputProps: {
                  min: 2,
                  max: 500
                }
              }}
              value={totalTeamMembers} onChange={e => setTotalTeamMembers(e.target.value)} />
          </p>
          <p style={{ marginTop: 20 }}>
            <Button
              type="submit"
              size="sm"
              onClick={handleStripePayment}
              style={{
                width: '28%',
                height: '40px',
                background: 'linear-gradient(74deg, #096dff, #00b1ff)',
                borderWidth: '0px'
              }}>Subscribe now</Button>
          </p>
        </div>
          :
          <div style={{ textAlign: 'center' }}>Comming soon...</div>}
        <p className="mt-4" style={{ textAlign: 'center', fontSize: 14 }}>{statusMessage}</p>
      </div>
    </div>;
  }
}
