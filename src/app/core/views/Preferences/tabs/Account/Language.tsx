import Dropdown from 'react-bootstrap/Dropdown';
import React from 'react';
import i18next from 'i18next';

export default function Language(): JSX.Element {
  return (
    <div>
      <Dropdown>
        <Dropdown.Item
          onClick={() => {
            i18next.changeLanguage('en');
          }}
        >
          English
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            i18next.changeLanguage('es');
          }}
        >
          Spanish
        </Dropdown.Item>
      </Dropdown>
    </div>
  );
}
