import React from 'react';
import { Card, Col } from 'react-bootstrap';
import './InxtContainerOption.scss';

import CheckIcon from './../assets/check.svg';

interface InxtContainerOptionProp {
  onClick: () => void,
  style: string,
  header: string,
  isChecked: boolean,
  text: string
}

function InxtContainerOption({ onClick, style, header, isChecked, text }: InxtContainerOptionProp): JSX.Element {

  return <Col className='InxtContainerOption' xs={12} md={4} sm={6}>
    <Card>
      <Card.Header onClick={onClick} style={{ background: style }}>
        <div className="card-header-content">{header}</div>
      </Card.Header>
      <Card.Text>
        {isChecked ? <img src={CheckIcon} alt="Current plan" /> : ''} {text}
      </Card.Text>
    </Card>
  </Col>;
}

export default InxtContainerOption;