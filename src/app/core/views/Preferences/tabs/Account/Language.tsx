import Dropdown from 'react-bootstrap/Dropdown';
import React from 'react';

export default function Language(): JSX.Element {
  return (
    <div>
      <Dropdown>
        <Dropdown.Item
          onClick={() => {
            // i18n.setLocale('en');
          }}
        >
          English
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            // i18n.setLocale('es');
          }}
        >
          Spanish
        </Dropdown.Item>
      </Dropdown>
    </div>
  );
}
