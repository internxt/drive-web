import React from 'react';
import './PasswordStrength.scss'
import { ProgressBar } from 'react-bootstrap'
import CheckPasswordStrength from 'check-password-strength'

interface PasswordStrengthProps {
    password: string
}

interface PasswordStrengthState {
    percentage: number
}

class PasswordStrength extends React.Component<PasswordStrengthProps, PasswordStrengthState> {
    state = {
        percentage: 0
    }

    checkPassword(password: string) {
        if (!password) {
            return this.setState({ percentage: 0 })
        }
        const result = CheckPasswordStrength(password);
        this.setState({
            percentage: Math.floor((result.id + 1) * 100 / 3)
        })
        
    }

    componentDidUpdate(oldProps) {
        if (oldProps.password !== this.props.password) {
            this.checkPassword(this.props.password)
        } 
    }

    render() {
        return <div className="password-strength">
            <ProgressBar max={100} now={this.state.percentage} />
        </div>
    }
}

export default PasswordStrength;