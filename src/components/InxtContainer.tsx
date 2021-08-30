import React from 'react';
import { Container } from 'react-bootstrap';
import './InxtContainer.scss';

interface InxtContainerProps {
  style?: React.CSSProperties;
  children: any;
  text?: string | Element;
}

class InxtContainer extends React.Component<InxtContainerProps> {
  render(): JSX.Element {
    return (
      <Container className="InxtContainer" style={this.props.style}>
        {this.props.children}
      </Container>
    );
  }
}

export default InxtContainer;
