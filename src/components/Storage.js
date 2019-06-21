import React from 'react';
import Plans from './Plans';
import NavigationBar from './navigationBar/NavigationBar';
import PayMethods from './PayMethods';
import "./Storage.css";
import history from '../history';
import InxtContainer from './InxtContainer'
import StorageProgressBar from './StorageProgressBar';
import StoragePlans from './StoragePlans'
import PrettySize from 'prettysize'

import Circle from './Circle'
import { Row, Col } from 'react-bootstrap';


class Storage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            page: null,
            max: null,
            now: null
        }

    }

    componentDidMount() {
        // Check auth and redirect to login if necessary
        if (!this.props.isAuthenticated) {
            history.push('/login');
        } else {
            this.usageLoader();
        }
    }

    payMethodLoader = (plan) => {
        console.log(plan);
        if (plan.stripe_plan_id != null) {
            this.setState({
                page: <PayMethods choosedPlan={plan} />
            });
        }
    }

    usageLoader = () => {
        let user = JSON.parse(localStorage.xUser).email;

        fetch('/api/limit', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: user
            })
        }
        ).then(res => {
            return res.json();
        }).then(res2 => {
            this.setState({ max: res2.maxSpaceBytes })
        }).catch(err => {
            console.log(err);
        });

        fetch('/api/usage', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: user
            })
        }
        ).then(res => res.json())
            .then(res2 => {
                this.setState({ now: res2.total })
            }).catch(err => {
                console.log(err);
            });
    }

    render() {
        return (
            <div className="settings">
                <NavigationBar navbarItems={<h5>Storage</h5>} showSettingsButton={true} showFileButtons={false} />
                <InxtContainer>
                    <p className="title">Storage Used</p>

                    <p className="space-used-text">Used <b>{PrettySize(this.state.now, true, false)}</b> of <b>{PrettySize(this.state.max, true, false)}</b></p>
                    <StorageProgressBar max={this.state.max} now={this.state.now} />

                    <Row className="space-used-legend">
                        <Col xs={12} md={6} sm={6}>
                            <Circle image="linear-gradient(59deg, #096dff, #00b1ff)" /> <span>Used storage space</span>
                        </Col>

                        <Col xs={12} md={6} sm={6}>
                            <Circle color="#e9ecef" /> <span>Unused storage space</span>
                        </Col>
                    </Row>
                </InxtContainer>

                <InxtContainer>
                    <StoragePlans currentPlan={this.state.max} />
                </InxtContainer>
                {this.state.page}
            </div>
        );
    }
}

export default Storage;