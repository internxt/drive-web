import React from 'react';
import ClickToSelect from '@mapbox/react-click-to-select';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import copy from 'copy-to-clipboard';
import { clearTimeout, setTimeout } from 'timers';
import { connect } from 'react-redux';

import { getHeaders } from '../../../lib/auth';

import { RootState } from '../../../store';
import { UserSettings } from '../../../models/interfaces';
import history from '../../../lib/history';

import './ShareItemDialog.scss';
import BaseDialog from '../BaseDialog/BaseDialog';
import { Workspace } from '../../../models/enums';

interface ShareItemDialogProps {
  item: any;
  open: boolean;
  user: UserSettings;
  onClose: () => void;
  workspace: Workspace
}

interface ShareItemDialogState {
  link: string | null;
  views: number;
  animationCss: string;
}

class ShareItemDialog extends React.Component<ShareItemDialogProps, ShareItemDialogState> {
  state = {
    link: null,
    views: 10,
    animationCss: ''
  }

  timeout: NodeJS.Timeout = setTimeout(() => { }, 0);

  get itemFullName(): string {
    const { item } = this.props;
    const itemExtension: string = item.type ? `.${item.type}` : '';

    return `${item.name}${itemExtension}`;
  }

  componentDidMount() {
    this.handleShareLink(this.state.views);
  }

  generateShortLink = (url: string) => {
    const isTeam = this.props.workspace === Workspace.Business ? true : false;

    return new Promise((resolve, reject) => {
      fetch('/api/storage/shortLink', {
        method: 'POST',
        headers: getHeaders(true, true, isTeam),
        body: JSON.stringify({ 'url': url })
      }).then(res => res.json()).then(res => {
        resolve(res.shortUrl);
      }).catch(reject);
    });
  }

  generateShareLink = (fileId: string, views: number) => {
    const isTeam = this.props.workspace === Workspace.Business ? true : false;

    return new Promise((resolve, reject) => {
      fetch(`/api/storage/share/file/${fileId}`, {
        method: 'POST',
        headers: getHeaders(true, true, isTeam),
        body: JSON.stringify({
          'isFolder': this.props.item.isFolder ? 'true' : 'false',
          'views': views
        })
      }).then((res: Response) => {
        if (res.status !== 200) {
          throw res;
        }
        return res.json();
      }).then((res: any) => {
        const link = `${window.location.origin}/${res.token}`;

        resolve(link);
      }).catch((err: Response) => {
        if (err.status === 401) {
          history.push('/login');
        }
        reject(err);
      });
    });
  }

  handleChange(e) {
    if (this.state.link) {
      this.setState({ link: null });
    }
    const views = e.currentTarget.value;

    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.handleShareLink(parseInt(views));
    }, 750);
  }

  handleShareLink(views: number) {
    const fileId = this.props.item.isFolder ? this.props.item.id : this.props.item.fileId;

    if (!this.props.item.isFolder && this.props.item.isDraggable === false) {
      return this.setState({
        link: 'https://internxt.com/Internxt.pdf'
      });
    }

    this.generateShareLink(fileId, views).then(link => {
      window.analytics.track('file-share');
      this.setState({ link: link });
    }).catch((err) => {
      if (err.status === 402) {
        const itemType = this.props.item.isFolder ? 'older' : 'ile';

        this.setState({ link: 'Unavailable link' });
        toast.warn(`F${itemType} too large.\nYou can only share f${itemType}s of up to 200 MB through the web app`);
      }
    });
  }

  onCopyButtonClicked = (): void => {
    this.setState({ animationCss: 'copy-effect' }, () => {
      setTimeout(() => {
        this.setState({ animationCss: '' });
      }, 1000);
    });

    if (this.state.link) {
      copy('Hello,\nHow are things going? I’m using Internxt Drive, a secure, simple, private and eco-friendly cloud storage service https://internxt.com/drive\nI wanted to share a file with you through this direct secure link: ' + this.state.link + '');
    }
  }

  render(): JSX.Element {
    const { item, open } = this.props;

    return (<BaseDialog title={this.itemFullName} isOpen={open} onClose={this.props.onClose}>
      <div>
        <div className="text-sm text-center">
          <div>
            Share your Drive {item.isFolder ? 'folder' : 'file'} with this private link. Or enter
            the number of times you'd like the link to be valid:&nbsp;&nbsp;
          </div>
        </div>

        <div className="flex justify-center p-5">
          <input
            onChange={this.handleChange.bind(this)}
            type="number"
            defaultValue={this.state.views} size={3}
            step="1"
            min="1"
            className="w-14"
          />
        </div>

        <div className="flex justify-center items-center">
          <ClickToSelect containerElement="div">
            <p>{this.state.link == null ? 'Loading...' : this.state.link}</p>
          </ClickToSelect>
          <div>
            <button className="secondary" onClick={this.onCopyButtonClicked}>Copy</button>
            <a href="# "
              className={`pointer-events-none relative opacity-0 -left-11 ${this.state.animationCss}`}
            >Copy</a>
          </div>
        </div>
      </div>
    </BaseDialog>
    );
  }
}

export default connect(
  (state: RootState) => ({
    user: state.user.user,
    workspace: state.team.workspace
  }))(ShareItemDialog);