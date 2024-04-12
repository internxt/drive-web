import Section from 'app/core/views/Preferences/components/Section';
import { useEffect, useState } from 'react';

import { bytesToString } from '../../drive/services/size.service';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';

import Avatar from '../../shared/components/Avatar';
import Button from '../../shared/components/Button/Button';
import Card from '../../shared/components/Card';
import Input from '../../shared/components/Input';

import Tooltip from '../../shared/components/Tooltip';
import { DriveProduct, Member, MemberRole } from '../types';
import UserInviteDialog from '../Workspace/Members/InviteDialog';

const searchMembers = (membersList: Member[], searchString: string) => {
  const escapedSearchString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedSearchString, 'i');

  const resultados = membersList.filter((obj) => {
    const fullName = obj.name + ' ' + obj.lastname;
    return regex.test(fullName);
  });

  return resultados || [];
};

const MembersSection = () => {
  const { translate } = useTranslationContext();
  const [searchedMemberName, setSearchedMemberName] = useState('');
  const [hoverItemIndex, setHoverItemIndex] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // MOCKED
  const guestsNumber = 0;
  const members = [
    {
      id: '123123',
      name: 'Jonh',
      lastname: 'Doe',
      email: 'jonh@internxt.com',
      role: 'owner' as MemberRole,
      products: [
        { name: 'Drive', usageInBytes: 1720000000000, color: 'primary' },
        { name: 'Backups', usageInBytes: 123000, color: 'indigo' },
      ],
      storage: 2200000000000,
    },
    {
      id: '123124',
      name: 'Michael',
      lastname: 'Dalesom',
      email: 'michael@internxt.com',
      role: 'manager' as MemberRole,
      products: [
        { name: 'Drive', usageInBytes: 524000000000, color: 'primary' },
        { name: 'Backups', usageInBytes: 12300000, color: 'indigo' },
      ],
      storage: 1100000000000,
    },
    {
      id: '123123214',
      name: 'Bea',
      lastname: 'Donell',
      email: 'bea@internxt.com',
      role: '' as MemberRole,
      products: [{ name: 'Drive', usageInBytes: 824000000000, color: 'primary' }],
      storage: 1100000000000,
    },
  ] as Member[];
  const [displayedMembers, setDisplayedMembers] = useState(members);

  useEffect(() => {
    const newMembers = searchMembers(members, searchedMemberName);
    setDisplayedMembers(newMembers);
  }, [searchedMemberName]);

  return (
    <Section title="Members" className="flex max-h-640 flex-1 flex-col space-y-6 overflow-y-auto p-6">
      {/* MEMBERS AND GUESTS CARDS */}
      <div className="fles-row flex w-full justify-between space-x-6">
        <Card className="w-full">
          <div className="flex grow flex-col">
            <span className="text-xl font-medium text-gray-100">{members.length}</span>
            {translate('preferences.workspace.members.members')}
            <span className="text-base font-normal text-gray-60"></span>
          </div>
        </Card>
        <Card className="w-full">
          <div className="flex grow flex-col">
            <span className="text-xl font-medium text-gray-100">{guestsNumber}</span>
            <span className="text-base font-normal text-gray-60">
              {translate('preferences.workspace.members.guests')}
            </span>
          </div>
        </Card>
      </div>
      {/* MEMBERS LIST */}
      <div className="flex flex-row justify-between">
        <Input
          placeholder={translate('preferences.workspace.members.search')}
          variant="email"
          autoComplete="off"
          onChange={setSearchedMemberName}
          value={searchedMemberName}
          name="memberName"
        />
        <Button variant="primary" onClick={() => setIsInviteDialogOpen(true)}>
          {translate('preferences.workspace.members.invite')}
        </Button>
      </div>
      <div>
        <div className="flex">
          {/* LEFT COLUMN */}
          <div className="flex grow flex-col">
            <div className="flex grow flex-col">
              <span
                className={
                  'flex h-12 flex-row items-center justify-between rounded-tl-xl border-b border-l border-t border-gray-10 bg-gray-5 px-5 py-2 '
                }
              >
                {translate('preferences.workspace.members.list.user')}
              </span>
            </div>
            {displayedMembers.map(({ name, lastname, role, email, id }, i) => (
              <div
                key={id}
                className={`flex h-14 flex-row justify-between border-l border-gray-10 px-5 py-2 text-base  font-medium text-gray-100 dark:bg-gray-1 ${
                  i === members.length - 1 ? 'rounded-bl-xl border-b' : ' border-b'
                }
            ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : 'bg-surface'}`}
                onMouseEnter={() => setHoverItemIndex(id)}
                onMouseLeave={() => setHoverItemIndex(null)}
              >
                <User name={name} lastname={lastname} role={role} email={email} avatarsrc={''} />
              </div>
            ))}
          </div>
          {/* CENTER COLUMN */}
          <div className="flex grow flex-col">
            <div className="flex h-12 items-center border-b border-t border-gray-10 bg-gray-5 py-2">
              <span
                className={
                  'flex w-full items-center justify-between border-l border-r border-gray-10 bg-gray-5 pl-5 pr-1 '
                }
              >
                {translate('preferences.workspace.members.list.usage')}
              </span>
            </div>
            {displayedMembers.map(({ storage, products, id }, i) => (
              <div
                key={id}
                className={`justify-betweendw flex h-14 items-center border-gray-10 px-5 py-2 text-base font-normal text-gray-60 dark:bg-gray-1 ${
                  i === members.length - 1 ? 'border-b' : ' border-b'
                } ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : 'bg-surface'}`}
                onMouseEnter={() => setHoverItemIndex(id)}
                onMouseLeave={() => setHoverItemIndex(null)}
              >
                <div className="flex w-full items-center justify-between">
                  <UsageBar isHovered={hoverItemIndex === id} storage={storage} products={products} />
                  {bytesToString(products.reduce((total, product) => total + product.usageInBytes, 0))}
                </div>
              </div>
            ))}
          </div>
          {/* RIGHT COLUMN */}
          <div className="flex w-28 flex-col rounded-tr-xl">
            <div>
              <div className="flex h-12 items-center truncate rounded-tr-xl border-b border-t border-gray-10 bg-gray-5 p-5">
                <span className={'truncate rounded-tr-xl'}>
                  {translate('preferences.workspace.members.list.storage')}
                </span>
              </div>
            </div>
            {displayedMembers.map(({ storage, id }, i) => (
              <div
                key={id}
                className={`flex h-14 flex-row items-center justify-between border-r border-gray-10 py-2 pl-5 text-base font-normal text-gray-60 ${
                  i === members.length - 1 ? 'rounded-br-xl border-b' : 'border-b'
                } ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : ''}`}
                onMouseEnter={() => setHoverItemIndex(id)}
                onMouseLeave={() => setHoverItemIndex(null)}
              >
                <span className=" text-base font-medium leading-5">{bytesToString(storage)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <UserInviteDialog isOpen={isInviteDialogOpen} onClose={() => setIsInviteDialogOpen(false)} />
    </Section>
  );
};

interface UsageBarProps {
  isHovered: boolean;
  storage: number;
  products: DriveProduct[];
}

const UsageBar = ({ isHovered, storage, products }: UsageBarProps) => {
  const colorMapping: { [key in (typeof products)[number]['color']]: string } = {
    red: 'bg-red',
    orange: 'bg-orange',
    yellow: 'bg-yellow',
    green: 'bg-green',
    pink: 'bg-pink',
    indigo: 'bg-indigo',
    primary: 'bg-primary',
    gray: 'bg-gray-40',
  };

  return (
    <div>
      <div
        className={`flex h-4 w-36 rounded-md bg-gray-5 ${
          isHovered ? 'bg-surface' : 'bg-gray-5 dark:bg-gray-5'
        } box-content border border-gray-10`}
      >
        {products.map((product, i) => (
          <Tooltip
            key={product.name}
            title={product.name}
            subtitle={bytesToString(product.usageInBytes)}
            popsFrom="top"
          >
            <div
              style={{ width: `${Math.max((product.usageInBytes / storage) * 144, 12)}px` }}
              className={`h-4 border-r border-surface ${colorMapping[product.color]}
                        dark:border-gray-1 ${i === 0 ? 'rounded-l-md' : ''} ${
                i === products.length - 1 ? 'rounded-r-md' : ''
              }`}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

interface UserProps {
  name: string;
  lastname: string;
  role?: MemberRole;
  email: string;
  avatarsrc: string | null;
}

export const User = ({ name, lastname, role, email, avatarsrc }: UserProps) => {
  const { translate } = useTranslationContext();

  const roleColorMapping = {
    owner: 'bg-indigo',
    manager: 'bg-primary/50',
  };

  return (
    <div className="flex flex-row space-x-2">
      <Avatar src={avatarsrc} fullName={`${name} ${lastname}`} diameter={36} />
      <div className="flex flex-col">
        <div className="flex flex-row justify-between space-x-2">
          <span className="text-base font-medium leading-5 text-gray-100">
            {name} {lastname}
          </span>
          {!!role && (
            <div className={`flex items-center justify-center rounded-md ${roleColorMapping[role]} px-1`}>
              <span className="text-center text-xs font-medium text-white">
                {!!role && translate(`preferences.workspace.members.role.${role}`)}
              </span>
            </div>
          )}
        </div>
        <span className="text-sm font-normal leading-4 text-gray-50">{email}</span>
      </div>
    </div>
  );
};

export default MembersSection;
