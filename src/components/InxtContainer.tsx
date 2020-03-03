import React from 'react'
import { Container } from 'react-bootstrap';
import './InxtContainer.scss'

interface InxtContainerProps {
    style?: React.CSSProperties
    children: any
}

class InxtContainer extends React.Component<InxtContainerProps> {
    render() {
        return <Container className="InxtContainer" style={this.props.style}>
            {this.props.children}
        </Container>
    }
}

export default InxtContainer;