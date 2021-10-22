import React, { Component } from 'react';
import { Button, Container, Dropdown, DropdownButton, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import copy from 'copy-to-clipboard';

import { auth } from '@internxt/lib';

import twitter from '../../assets/Share-Icons/Twitter.svg';
import facebook from '../../assets/Share-Icons/Facebook.svg';
import telegram from '../../assets/Share-Icons/Telegram.svg';

import './ReferredView.scss';
import httpService from '../../../core/services/http.service';
import localStorageService from '../../../core/services/local-storage.service';
import { UserSettings } from '../../../auth/types';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';

interface ReferredViewState {
  email: string;
  credit: number;
  textToCopy: string;
  copySuccess: string;
  isOpen: boolean;
  text: string;
  value: string;
}

class ReferredView extends Component<React.Attributes, ReferredViewState> {
  state = {
    email: '',
    credit: 0,
    textToCopy: '',
    copySuccess: '',
    isOpen: false,
    text: '',
    value: '',
  };

  componentDidMount(): void {
    const user = localStorageService.getUser() as UserSettings;

    this.getCredit();
    this.setState({ textToCopy: `https://internxt.com/?ref=${user.uuid}` });
    this.setState({ copySuccess: 'Copy' });
    const socialText = this.parseUrl(
      "I've made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 10 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!",
    );

    this.setState({ text: socialText });
  }

  getCredit = (): Promise<void> => {
    return fetch(`${process.env.REACT_APP_API_URL}/api/user/credit`, {
      method: 'GET',
      headers: httpService.getHeaders(true, false),
    })
      .then(async (res) => {
        if (res.status !== 200) {
          throw res;
        }
        return { response: res, data: await res.json() };
      })
      .then(async ({ data }) => {
        const credit = data.userCredit;

        this.setState({ credit: credit });
      });
  };

  parseUrl = (text: string): string => {
    return new URLSearchParams(text).toString();
  };

  copyToClipboard = (): void => {
    this.setState({ copySuccess: 'Copied' });
    copy(this.state.textToCopy);
  };

  handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      email: event.target.value,
    });
  };

  sendInvitationEmail = (email: string): Promise<void> => {
    return fetch(`${process.env.REACT_APP_API_URL}/api/user/invite`, {
      method: 'POST',
      headers: httpService.getHeaders(true, false),
      body: JSON.stringify({ email }),
    })
      .then(async (res) => {
        return { response: res, data: await res.json() };
      })
      .then((res) => {
        if (res.response.status !== 200) {
          throw res.data;
        } else {
          notificationsService.show(`Invitation email sent to ${email}`, ToastType.Info);
        }
      })
      .catch((err) => {
        toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
      });
  };

  sendClaimEmail = (): Promise<void> => {
    return fetch(`${process.env.REACT_APP_API_URL}/api/user/claim`, {
      method: 'POST',
      headers: httpService.getHeaders(true, false),
      body: JSON.stringify({ email: this.state.email }),
    })
      .then(async (res) => {
        return { response: res, data: await res.json() };
      })
      .then((res) => {
        if (res.response.status !== 200) {
          throw res.data;
        } else {
          toast.info('Claim email sent to hello@internxt.com');
        }
      })
      .catch((err) => {
        toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
      });
  };

  render(): JSX.Element {
    const user = localStorageService.getUser() as UserSettings;

    return (
      <div>
        <div className="Referred">
          <Container className="referred-box p-5">
            <div className="referred-title">Earn money by referring friends</div>
            <div className="referred-description py-3">
              Invite friends who aren't on Internxt yet. You'll both get €5 of Internxt credit as soon as they activate
              their account. You can redeem that credit for a premium Internxt membership, or exclusive Internxt merch.
              Start earning money today!
            </div>

            <Container className="mail-container mt-3">
              <div className="row">
                <div className="col-10 pl-0">
                  <Form.Control
                    className="mail-box"
                    type="email"
                    placeholder="example@example.com"
                    value={this.state.email}
                    onChange={this.handleEmailChange}
                  />
                </div>
                <Button
                  className="invite-button col-2"
                  type="button"
                  onClick={() => {
                    const mail = this.state.email;

                    if (mail !== undefined && auth.isValidEmail(mail)) {
                      this.setState({ email: '' });
                      this.sendInvitationEmail(mail);
                    } else {
                      toast.warn('Please, enter a valid email before sending out the invite');
                    }
                  }}
                >
                  Invite
                </Button>
              </div>
            </Container>
            <Container className="row m-0 mt-4 p-0">
              <div className="col-8 px-0">
                <div className="referred-url">
                  <input type="text" readOnly value={`https://internxt.com/?ref=${user.uuid}`} />
                </div>
              </div>
              <div className="col-2 px-0 mx-0 d-flex">
                <Button type="button" className="copy-button m-auto" onClick={this.copyToClipboard}>
                  {this.state.copySuccess}
                </Button>
              </div>
              <div className="col-2 d-flex p-0">
                <DropdownButton className="share-container m-auto" title="Share">
                  <Dropdown.Item
                    className="social-button"
                    href={`https://twitter.com/intent/tweet?url=https://internxt.com/?ref=${user.uuid}&${this.parseUrl(
                      "I've made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 10 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!",
                    )}`}
                    target="_blank"
                    data-size="large"
                    original-referer={`https://internxt.com/?ref=${user.uuid}`}
                    data-lang="en"
                  >
                    <img src={twitter} alt="" />
                  </Dropdown.Item>
                  <Dropdown.Item
                    className="social-button"
                    data-href={`https://internxt.com/?ref=${user.uuid}`}
                    href={`https://www.facebook.com/sharer/sharer.php?u=https://internxt.com/?ref=${
                      user.uuid
                    }&amp;src=sdkpreparse&${this.parseUrl(
                      "I've made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 10 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!",
                    )}`}
                    target="_blank"
                  >
                    <img src={facebook} alt="" />
                  </Dropdown.Item>
                  <Dropdown.Item
                    className="social-button"
                    href={`https://t.me/share/url?${this.parseUrl(
                      "I've made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 10 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!",
                    )}&url=https://internxt.com/?ref=${user.uuid}`}
                    target="_blank"
                  >
                    <img src={telegram} alt="" />
                  </Dropdown.Item>
                </DropdownButton>
              </div>
            </Container>

            <div className="user-credit py-4">{`You have accumulated €${this.state.credit} `}</div>

            <Button
              block
              className="referred-button"
              type="button"
              onClick={() => {
                if (this.state.credit > 0) {
                  this.sendClaimEmail();
                } else {
                  toast.info("You don't have any credit on your account");
                }
              }}
            >
              Claim
            </Button>
          </Container>
        </div>
      </div>
    );
  }
}

export default ReferredView;
