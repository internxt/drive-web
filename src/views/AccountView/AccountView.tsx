import { Component } from 'react';

interface AccountViewProps { }

interface AccountViewState { }

class AccountView extends Component<AccountViewProps, AccountViewState> {
  constructor(props: AccountViewProps) {
    super(props);

    this.state = {
      page: null,
      max: 0,
      now: 0,
      processing: false,
      modalDeleteAccountShow: false,
      isAppSumo: false,
      appSumoDetails: null,
      isLoading: true
    };
  }

  render(): JSX.Element {
    return (
      <div>
        ACCOUNT VIEW
      </div >
    );
  }
}

export default AccountView;
