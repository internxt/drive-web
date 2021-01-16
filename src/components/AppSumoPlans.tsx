import React from 'react'
import { Button, Container } from 'react-bootstrap'
import './AppSumoPlans.scss';

export default function AppSumoPlans() {
  return <Container className="appsumo-plans">
    <h5>AppSumo plan: {'Hola'}</h5>
    <Button block>Change plan</Button>
  </Container>;
}