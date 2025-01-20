import { useState, useRef, useEffect } from 'react';
import { t } from 'i18next';
import { FunnelSimple } from '@phosphor-icons/react';

import { Button, RadioButton } from '@internxt/ui';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';

interface ActivityFiltersProps {
  isSelectedRoles: string[];
  setIsSelectedRoles: (selectedRoles) => void;
}

const ActivityFilters = ({ isSelectedRoles, setIsSelectedRoles }: ActivityFiltersProps) => {
  const roles = [
    { type: 'member', name: t('preferences.workspace.members.tabs.activity.roles.member') },
    { type: 'manager', name: t('preferences.workspace.members.tabs.activity.roles.manager') },
    { type: 'owner', name: t('preferences.workspace.members.tabs.activity.roles.owner') },
  ];

  const dateRange = [
    { days: '7', name: t('preferences.workspace.members.tabs.activity.filter.dateRange.7days') },
    { days: '30', name: t('preferences.workspace.members.tabs.activity.filter.dateRange.30days') },
    { days: '90', name: t('preferences.workspace.members.tabs.activity.filter.dateRange.90days') },
  ];

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isFiltersModified, setIsFiltersModified] = useState<boolean>(false);
  const [rangeSelected, setRangeSelected] = useState<string>('7');
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  });

  const handleOutsideClick = (e) => {
    if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  };

  const onFilteredRoles = (roleType) => {
    const newSelectedRoles = [...isSelectedRoles];
    const roleIndex = newSelectedRoles.indexOf(roleType);
    const isSelected = newSelectedRoles.includes(roleType);

    isSelected ? newSelectedRoles.splice(roleIndex, 1) : newSelectedRoles.push(roleType);
    newSelectedRoles.length === 3 ? setIsFiltersModified(false) : setIsFiltersModified(true);
    setIsSelectedRoles(newSelectedRoles);
  };

  return (
    <div className="relative" ref={filterDropdownRef}>
      <Button variant="secondary" onClick={() => setIsOpen(!isOpen)}>
        {t('preferences.workspace.members.tabs.activity.filter.button')}
        <FunnelSimple size={24} className="ml-2" />
        {isFiltersModified && (
          <div className="fixed absolute right-5 top-0 mt-2.5 h-2 w-2 rounded-full border border-surface bg-primary"></div>
        )}
      </Button>
      <div
        className={`fixed absolute right-0 mt-1 w-64 overflow-hidden rounded-lg border border-gray-10 bg-surface shadow-xl transition-all duration-300 ease-in-out dark:bg-gray-5 ${
          isOpen ? 'block opacity-100' : 'hidden opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-10 p-3">
          <p className="text-lg font-medium text-gray-100">
            {t('preferences.workspace.members.tabs.activity.filter.title')}
          </p>
          <Button
            variant="secondary"
            disabled={!isFiltersModified}
            onClick={() => {
              setIsSelectedRoles(['member', 'manager', 'owner']);
              setIsFiltersModified(false);
            }}
          >
            {t('preferences.workspace.members.tabs.activity.filter.clear')}
          </Button>
        </div>
        <div className="px-4 pt-5 text-gray-100">
          <div className="mb-2 flex items-center">
            <h5 className="text-xs font-medium ">{t('preferences.workspace.members.tabs.activity.roles.title')}</h5>
            {isFiltersModified && <div className="ml-1 h-2 w-2 rounded-full border border-surface bg-primary"></div>}
          </div>
          <div className="flex flex-col">
            {roles.map((role) => {
              const isSelected = isSelectedRoles.includes(role.type);

              return (
                <div key={role.name} className="flex items-center py-1.5">
                  <BaseCheckbox checked={isSelected} onClick={() => onFilteredRoles(role.type)} />
                  <p className="font-regular ml-2 text-base">{role.name}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-4 pt-5 text-gray-100">
          <div className="mb-2 flex items-center">
            <h5 className="text-xs font-medium ">
              {t('preferences.workspace.members.tabs.activity.filter.dateRange.title')}
            </h5>
          </div>
          <div className="mb-3 flex flex-col">
            {dateRange.map((date) => {
              const isSelected = rangeSelected === date.days;

              return (
                <div className="flex items-center py-1.5" key={date.days}>
                  <RadioButton checked={isSelected} onClick={() => setRangeSelected(date.days)} />
                  <p className="font-regular ml-2 text-base">{date.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityFilters;
