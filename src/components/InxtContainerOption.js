import React from 'react';
import { Card, Col } from 'react-bootstrap';
import './InxtContainerOption.scss';

import CheckIcon from './../assets/check.svg';

class InxtContainerOption extends React.Component {
  render() {
    return <Col className='InxtContainerOption' xs={12} md={4} sm={6}><Card>
      <Card.Header onClick={this.props.onClick} style={{ background: this.props.style }}>
        <div className="card-header-content">{this.props.header}</div>
      </Card.Header>
      <Card.Text>
        {this.props.isChecked ? <img src={CheckIcon} alt="Current plan" /> : ''} {this.props.text}
      </Card.Text>
    </Card></Col>;
  }
}

export default InxtContainerOption;