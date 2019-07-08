import React from 'react'
import { Container } from 'react-bootstrap';
import './InxtContainer.scss'

class InxtContainer extends React.Component {
    render() {
        return <Container className="InxtContainer" style={this.props.style}>
            {this.props.children}
        </Container>
    }
}

export default InxtContainer;