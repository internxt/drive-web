import React from 'react';
import { Container, ListGroup } from 'react-bootstrap';
import './Login.scss';
import './Reset.scss';
import { Form, Button } from 'react-bootstrap';
import NavigationBar from './../navigationBar/NavigationBar';
import history from '../../lib/history';
import InxtContainer from './../InxtContainer';
import TeamsPlans from './../TeamPlans';
import { getHeaders } from '../../lib/auth';
//saveTeamsMembersimport { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { toast } from 'react-toastify';
import './Teams.scss';
import closeTab from '../../assets/Dashboard-Icons/close-tab.svg';
import Popup from 'reactjs-popup';
const openpgp = require('openpgp');


interface Props {
    match?: any
    isAuthenticated: Boolean
    templateOption?: string
}

interface State {
    user: {
        email: string,
        isAdmin: Boolean,
        isTeamMember: Boolean
    }
    team: {
        bridgeUser: string,
        teamPassword: string
    }
    idTeam: number
    teamName: string
    email: string
    isTeamActivated: boolean
    menuTitle: string
    visibility: string
    showDescription: boolean
    template: any
    templateOption?: string
    dataSource: Item[]
    modalDeleteAccountShow: boolean,
}

interface Item {
    isMember: Boolean
    isInvitation: Boolean
    user: string
}

class Teams extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);

        let renderOption = this.props.match.params.option

        this.state = {
            user: {
                email: '',
                isAdmin: false,
                isTeamMember: false
            },
            team: {
                bridgeUser: '',
                teamPassword: ''
            },
            idTeam: 0,
            teamName: '',
            email: '',
            isTeamActivated: false,
            menuTitle: 'Create',
            visibility: '',
            showDescription: false,
            templateOption: renderOption,
            template: () => { },
            dataSource: [],
            modalDeleteAccountShow: false,

        }

        this.handleChangePass = this.handleChangePass.bind(this);
    }

    handleShowDescription = (_showDescription) => {
        this.setState({ showDescription: _showDescription });
    }

    handleChangePass = (event: React.FormEvent<HTMLInputElement>) => {
        this.setState({ team: { ...this.state.team, teamPassword: event.currentTarget.value } });
    }


    handlePassword = (password: any) => {
    }


    isLoggedIn = () => {
        return !(!localStorage.xToken);
    }

    componentDidMount() {
        if (!this.isLoggedIn()) {
            history.push('/login');
        }


        if (localStorage.getItem('xTeam')) {
            this.setState({ template: this.renderTeamSettings.bind(this) })
        } else {
            this.setState({ template: this.renderPlans.bind(this) })
        }



        const idTeam = JSON.parse(localStorage.getItem('xTeam') || '{}').idTeam;
        return fetch(`/api/teams/members/${idTeam}`, {
            method: 'get',
            headers: getHeaders(true, false),
        }).then((response) => {
            response.json().then((response) => {

                this.setState({ dataSource: response })
            }).catch((error) => {
                console.log(error);
            });
        }).catch((error) => {
            console.log();
        });


    }

    sendEmailTeamsMember = async (mail) => {
        await fetch(`/api/user/keys/${mail}`, {
            method: 'GET',
            headers: getHeaders(true, false),
        }).then((response) => {
            response.json().then(async (keys) => {
                //Datas
                const bridgePass = JSON.parse(localStorage.getItem("xTeam") || "{}").password;
                const mnemonicTeam = JSON.parse(localStorage.getItem("xTeam") || "{}").mnemonic;
                const publicKeyArmored = Buffer.from(keys.publicKey, 'base64').toString()

                //Encrypt
                const EncryptBridgePass = await openpgp.encrypt({
                    message: openpgp.message.fromText(bridgePass),
                    publicKeys: ((await openpgp.key.readArmored(publicKeyArmored)).keys),
                });
                const EncryptMnemonicTeam = await openpgp.encrypt({
                    message: openpgp.message.fromText(mnemonicTeam),
                    publicKeys: ((await openpgp.key.readArmored(publicKeyArmored)).keys),

                });

                const base64bridge_password = Buffer.from(EncryptBridgePass.data).toString('base64')
                const base64Mnemonic = Buffer.from(EncryptMnemonicTeam.data).toString('base64')
                const bridgeuser = JSON.parse(localStorage.getItem("xTeam") || "{}").user;
                const idTeam = JSON.parse(localStorage.getItem("xTeam") || "{}").idTeam;
            
                await fetch('/api/teams/team-invitations', {
                    method: 'POST',
                    headers: getHeaders(true, false, true),
                    body: JSON.stringify({
                        email: mail,
                        bridgePass: base64bridge_password,
                        mnemonicTeam: base64Mnemonic,
                        bridgeuser: bridgeuser,
                        idTeam: idTeam
                    })
                }).then(async res => {
                    return { response: res, data: await res.json() };
                }).then(res => {
                    if (res.response.status !== 200) {
                        throw res.data;
                    } else {
                        toast.info(`Invitation email sent to ${mail}`);
                    }
                }).catch(err => {
                    toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
                });

            }).catch((error) => {
            });
        }).catch((error) => {
            console.log('Error getting pubKey', error);
        });
    }


    handleEmailChange = (event) => {
        this.setState({
            email: event.target.value
        });
    }

    formRegisterSubmit = (e: any) => {
        e.preventDefault();

    }

    renderProductDescription = (): JSX.Element => {
        if (this.state.showDescription) {
            return (
                <InxtContainer>
                    <p className="title1">Plans Description</p>

                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ paddingRight: 12 }}>
                                <p className="title1">20GB</p>
                                <p>Secure file sharing</p>
                                <p>Access anywhere</p>
                                <p>End-to-end encryption</p>
                                <p>Collaboration</p>
                                <p>Administration tools</p>
                            </div>

                            <div style={{ border: 'solid 1px #eaeced' }}></div>
                        </div>

                        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ paddingRight: 12 }}>
                                <p className="title1">200GB</p>
                                <p>Secure file sharing</p>
                                <p>Access anywhere</p>
                                <p>End-to-end encryption</p>
                                <p>Collaboration</p>
                                <p>Administration tools</p>
                            </div>

                            <div style={{ border: 'solid 1px #eaeced' }}></div>
                        </div>

                        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{}}>
                                <p className="title1">2TB</p>
                                <p>Secure file sharing</p>
                                <p>Access anywhere</p>
                                <p>End-to-end encryption</p>
                                <p>Collaboration</p>
                                <p>Administration tools</p>
                            </div>
                        </div>
                    </div>
                </InxtContainer>
            );
        } else {
            return <div></div>
        }
    }

    renderPlans = (): JSX.Element => {
        return (
            <div className="settings">
                <NavigationBar navbarItems={<h5>Teams</h5>} isTeam={false} showSettingsButton={true} showFileButtons={false} isAdmin={false} isMember={false} />

                <InxtContainer>
                    <TeamsPlans handleShowDescription={this.handleShowDescription} />
                </InxtContainer>

                {this.renderProductDescription()}
            </div>
        );
    }

    handleChangeName = (event: React.FormEvent<HTMLInputElement>) => {
        this.setState({ teamName: event.currentTarget.value });
    }


    handleKeySaved = (user: JSON) => {
        localStorage.setItem('xUser', JSON.stringify(user));
    }

    validateEmailInvitations = (email) => {
        // eslint-disable-next-line no-control-regex
        const emailPattern = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/
        return emailPattern.test(email.toLowerCase());
    }

    sendInvitation = (e: any) => {
        e.preventDefault()
        const mails = this.state.email;
        if (mails !== undefined && this.validateEmailInvitations(mails)) {
            this.sendEmailTeamsMember(mails)
        } else {
            toast.warn(`Please, enter a valid email before sending out the invite`);
        }
        return
    }

    handleCancelAccount = () => {
        fetch('/api/teams/deleteAccount', {
            method: 'POST',
            headers: getHeaders(true, false,true),
            body: JSON.stringify({ email: this.state.email })
        }).then(async res => {
            return { response: res, data: await res.json() };
        }).then(res => {
            this.setState({ modalDeleteAccountShow: false });
            if (res.response.status !== 200) {
                throw res.data;
            } else {
                toast.info(`The request has been sent to hello@internxt.com`);
            }
        }).catch(err => {
            toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
        });
    }


    deletePeople = (item: Item) => {
        const idTeam = JSON.parse(localStorage.getItem("xTeam") || "{}").idTeam
        fetch(`/api/teams/${item.isMember ? 'member' : 'invitation'}`, {
            method: 'delete',
            headers: getHeaders(true, false),
            body: JSON.stringify({
                item: item,
                idTeam: idTeam
            })
        }).then((response) => {
            if (response.status === 200) {
                toast.info('The user has been successfully deleted');
            }
        }).catch(err => {
            toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
        });
    }

    renderTeamSettings() {
        return <div>
            <NavigationBar navbarItems={<h5>Teams</h5>} isTeam={true} showSettingsButton={true} showFileButtons={false} isAdmin={true} isMember={false} />
            <div className="Teams">
                <Container className="teams-box p-5">
                    <Form className="form-register" onSubmit={this.sendInvitation}>

                        <div className="teams-title">Manage your Team</div>
                        <div className="teams-description py-3">Welcome to your Team Drive account. Here you can add and remove team members and invitations.</div>
                        <Container className="mail-container mt-4">
                            <div className="row">
                                <div className="col-10 pl-0">
                                    <Form.Control className="mail-box" type="email" placeholder="example@example.com" value={this.state.email} onChange={this.handleEmailChange} />
                                </div>
                                <Button className="invite-button col-2" type="submit" onClick={() => {

                                }}>Invite</Button>
                            </div>
                        </Container>
                    </Form>
                    <Container fluid className="lista-container mt-4">
                        <ListGroup className='teams-lista'>
                            {this.state.dataSource.map(item => {
                                return <ListGroup.Item >
                                    <div className="row">
                                        <div className='col-11'><span>{item.user}</span></div>
                                        <div className='col-1'><span onClick={this.deletePeople.bind(this, item)}><i className="far fa-trash-alt"></i></span></div>
                                    </div>
                                </ListGroup.Item>
                            })}
                        </ListGroup>
                    </Container>

                </Container>
                <p className="deleteAccount" onClick={e => {
                    this.setState({ modalDeleteAccountShow: true });
                }}>Permanently Delete Account</p>

                <Popup open={this.state.modalDeleteAccountShow} className="popup--full-screen">
                    <div className="popup--full-screen__content delete-account-specific">
                        <div className="popup--full-screen__close-button-wrapper">
                            <img src={closeTab} onClick={e => {
                                this.setState({ modalDeleteAccountShow: false });
                            }} alt="Close tab" />
                        </div>
                        <div className="message-wrapper">
                            <h1>Are you sure?</h1>
                            <p className="delete-account-advertising">All your files will be gone forever and you will lose access to your Internxt Drive account. Any active subscriptions you might have will also be cancelled. Once you click delete account, a request will be sent to hello@internxt.com and the account will be deleted in a few hours.</p>
                            <div className="buttons-wrapper">
                                <div className="default-button button-primary delete-account-button"
                                    onClick={this.handleCancelAccount}>
                                    Delete account
                                    </div>
                            </div>

                        </div>
                    </div>
                </Popup>

            </div>
        </div>
    }

    render() {
        return (
            <div>
                {this.state.template()}
            </div>
        );
    }
}

export default Teams;