import React, { ReactNode } from 'react';

import './AppHeader.scss';

interface AppHeaderProps { }

interface AppHeaderState { }

class AppHeader extends React.Component<AppHeaderProps, AppHeaderState> {
  constructor(props: AppHeaderProps) {
    super(props);

    this.state = {};
  }

  render(): ReactNode {
    return (
      <div className="flex justify-end w-full border py-3 px-2">
        <div className="border flex ">
          <img src="" className="user-avatar rounded-2xl mr-1 border bg-l-neutral-30" />
          <span className="welcome-message text-neutral-500 text-sm">Welcome Sarah O'connor</span>
        </div>
      </div>
    );
  }
}

export default AppHeader;