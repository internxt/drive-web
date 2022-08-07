// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import i18n from 'app/i18n/services/i18n.service';
import dateService from '../../../core/services/date.service';
import BaseButton from '../../../shared/components/forms/BaseButton';
import { Trash, ClockCounterClockwise } from 'phosphor-react';
import List from '../../../shared/components/List';
import Grid from '../../../shared/components/Grid';
import { Dialog, Transition } from '@headlessui/react';
import { useState, Fragment, useEffect, FunctionComponent, SVGProps } from 'react';
import iconService from '../../../drive/services/icon.service';
import sizeService from '../../../drive/services/size.service';
import Empty from '../../../shared/components/Empty/Empty';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';

export default function TrashView(): JSX.Element {
  const [emptyTrashDialogIsOpen, setEmptyTrashDialogIsOpen] = useState<boolean>(false);
  const [deleteDialogIsOpen, setDeleteDialogIsOpen] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // List header columns
  const header = [
    {
      name: i18n.get('trash.list.name'),
      width: 'flex-1 min-w-104',
      data: 'item.name',
      order: function (a, b) {
        return a.name > b.name ? 1 : -1;
      },
    },
    {
      name: i18n.get('trash.list.size'),
      width: 'w-52',
      data: 'item.size',
      order: function (a, b) {
        return a.size > b.size ? 1 : -1;
      },
    },
    {
      name: i18n.get('trash.list.moved-to-trash'),
      width: 'w-40',
      data: 'trashed',
      order: function (a, b) {
        return new Date(a.trashed) < new Date(b.trashed) ? 1 : -1;
      },
      defaultDirection: 'asc',
    },
  ];

  // Composition of the item (content per item column)
  const listItemComposition = [
    (props) => {
      const Icon = iconService.getItemIcon(props.isFolder, props.item.type);
      return (
        <div className="flex w-full flex-row items-center space-x-4 overflow-hidden">
          <Icon className="flex h-8 w-8 flex-shrink-0 drop-shadow-soft filter" />
          <span className="w-full max-w-full flex-1 flex-row truncate whitespace-nowrap pr-16">{props.item.name}</span>
        </div>
      );
    },
    (props, selected) => (
      <span className={`${selected ? 'text-primary' : props.item.size ? 'text-gray-60' : 'text-gray-20'}`}>
        {sizeService.bytesToString(props.item.size || 0, false) ?? '—'}
      </span>
    ),
    (props, selected) => (
      <span className={`${selected ? 'text-primary' : 'text-gray-60'}`}>
        {dateService.format(props.trashed, 'D MMM YYYY')}
      </span>
    ),
  ];

  const gridItemComposition = (props, selected) => {
    const Icon = iconService.getItemIcon(props.isFolder, props.item.type);
    return (
      <div className="flex h-full w-full flex-shrink-0 flex-col items-center justify-start overflow-hidden">
        <div
          className={`ratio-square flex w-full flex-col items-center justify-center rounded-lg p-5 ${
            selected && 'bg-gray-1'
          }`}
        >
          <Icon className="flex h-full max-h-24 w-full flex-shrink-0 drop-shadow-soft filter" />
        </div>

        <div className="mt-2 flex h-16 w-full max-w-full flex-shrink-0 flex-col items-center text-center">
          <span
            className={`w-auto max-w-full break-words rounded-md py-1 px-2.5 text-base leading-tight line-clamp-2 ${
              selected && 'bg-primary text-white'
            }`}
          >
            {props.item.name}
          </span>
          <span className="mt-0.5 w-auto max-w-full whitespace-nowrap text-xs text-gray-50">
            {sizeService.bytesToString(props.item.size || 0, false)}
          </span>
        </div>
      </div>
    );
  };

  // const gridItemComposition = (props, selected) => {
  //   const Icon = iconService.getItemIcon(props.isFolder, props.item.type);
  //   return (
  //     <div
  //       className={`group flex h-full w-full flex-shrink-0 flex-col items-center justify-start overflow-hidden rounded-lg ${
  //         selected ? 'bg-primary bg-opacity-5' : 'border border-gray-5 group-hover:bg-gray-1'
  //       }`}
  //     >
  //       <div className="ratio-square flex w-full flex-col items-center justify-center p-5">
  //         <Icon className="flex h-full max-h-24 w-full flex-shrink-0 drop-shadow-soft filter" />
  //       </div>

  //       <div
  //         className={`flex h-10 w-full max-w-full flex-shrink-0 flex-row items-center space-x-1.5 rounded-t-lg px-2.5 text-center ${
  //           selected ? 'bg-primary text-white' : 'group-hover:bg-gray-5'
  //         }`}
  //       >
  //         <Icon className="flex h-5 w-5 flex-shrink-0 drop-shadow-soft filter" />
  //         <span className="w-auto max-w-full truncate whitespace-nowrap text-sm leading-tight">{props.item.name}</span>
  //       </div>
  //     </div>
  //   );
  // };

  // Skin skeleton when loading
  const skinSkeleton = [
    <div className="flex flex-row items-center space-x-4">
      <div className="h-8 w-8 rounded-md bg-gray-5" />
      <div className="h-4 w-40 rounded bg-gray-5" />
    </div>,
    <div className="h-4 w-20 rounded bg-gray-5" />,
    <div className="h-4 w-24 rounded bg-gray-5" />,
  ];

  // Empty state
  const emptyState = (
    <Empty
      icon={
        <div className="relative text-gray-20">
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9.58236 32H23.4025C24.3035 32 25.0108 31.7578 25.5242 31.2734C26.0474 30.789 26.3284 30.0963 26.3671 29.1953L27.2972 7.96367H29.477C29.7773 7.96367 30.0341 7.8571 30.2472 7.64396C30.4604 7.42113 30.5669 7.15955 30.5669 6.85922C30.5669 6.55889 30.4604 6.30215 30.2472 6.08901C30.0341 5.87587 29.7773 5.7693 29.477 5.7693H3.50789C3.21724 5.7693 2.96051 5.88071 2.73768 6.10354C2.52454 6.31668 2.41797 6.56857 2.41797 6.85922C2.41797 7.15955 2.52454 7.42113 2.73768 7.64396C2.96051 7.8571 3.21724 7.96367 3.50789 7.96367H5.70226L6.63232 29.1953C6.67107 30.0963 6.94718 30.789 7.46066 31.2734C7.98382 31.7578 8.69105 32 9.58236 32ZM11.893 27.8438C11.6314 27.8438 11.4134 27.7663 11.239 27.6113C11.0743 27.4563 10.992 27.248 10.992 26.9864L10.5415 11.1608C10.5415 10.9089 10.6238 10.7054 10.7885 10.5504C10.9532 10.3857 11.1761 10.3034 11.457 10.3034C11.7089 10.3034 11.9172 10.3809 12.0819 10.5359C12.2563 10.6909 12.3483 10.8943 12.358 11.1462L12.794 26.9864C12.8037 27.2383 12.7262 27.4466 12.5615 27.6113C12.3968 27.7663 12.1739 27.8438 11.893 27.8438ZM16.4997 27.8438C16.2188 27.8438 15.9911 27.7663 15.8167 27.6113C15.6423 27.4466 15.5551 27.2383 15.5551 26.9864V11.1608C15.5551 10.9089 15.6423 10.7054 15.8167 10.5504C15.9911 10.3857 16.2188 10.3034 16.4997 10.3034C16.771 10.3034 16.9938 10.3857 17.1682 10.5504C17.3426 10.7054 17.4298 10.9089 17.4298 11.1608V26.9864C17.4298 27.2383 17.3426 27.4466 17.1682 27.6113C16.9938 27.7663 16.771 27.8438 16.4997 27.8438ZM21.0919 27.8438C20.8109 27.8438 20.5881 27.7663 20.4234 27.6113C20.2587 27.4466 20.1812 27.2383 20.1909 26.9864L20.6269 11.1608C20.6366 10.8992 20.7238 10.6909 20.8885 10.5359C21.0628 10.3809 21.276 10.3034 21.5279 10.3034C21.8088 10.3034 22.0317 10.3857 22.1964 10.5504C22.3611 10.7054 22.4434 10.9089 22.4434 11.1608L21.9929 26.9864C21.9929 27.248 21.9057 27.4563 21.7313 27.6113C21.5666 27.7663 21.3535 27.8438 21.0919 27.8438ZM9.9602 6.23433H12.5905V3.69119C12.5905 3.32304 12.7068 3.02755 12.9393 2.80472C13.1718 2.5819 13.4867 2.47048 13.8839 2.47048H19.0865C19.4837 2.47048 19.7985 2.5819 20.031 2.80472C20.2636 3.02755 20.3798 3.32304 20.3798 3.69119V6.23433H22.9956V3.54587C22.9956 2.45111 22.6565 1.58886 21.9784 0.959128C21.3099 0.319709 20.3944 0 19.2318 0H13.7241C12.5615 0 11.6411 0.319709 10.9629 0.959128C10.2944 1.58886 9.9602 2.45111 9.9602 3.54587V6.23433Z"
              fill="currentColor"
            />
          </svg>
        </div>
      }
      title={i18n.get('trash.empty-state.title')}
      subtitle={i18n.get('trash.empty-state.subtitle')}
    />
  );

  // Item list
  const items = [
    {
      id: 1,
      trashed: 'Jul 10, 2022 08:00:00',
      isFolder: false,
      item: {
        size: 97123,
        name: 'sample_file_name.pdf',
        type: 'pdf',
      },
    },
    {
      id: 2,
      trashed: 'Jul 11, 2022 07:00:00',
      isFolder: false,
      item: {
        size: 15763892,
        name: 'sample_file_10_with_a_veeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeery_laaaaaaaaaaaaaaaaaaaaaaaaaaarge_name.png',
        type: 'png',
      },
    },
    {
      id: 3,
      trashed: 'Jul 07, 2022 09:00:00',
      isFolder: false,
      item: {
        size: 64783,
        name: 'smaple_js_file.js',
        type: 'js',
      },
    },
    {
      id: 4,
      trashed: 'Jul 12, 2022 08:00:00',
      isFolder: false,
      item: {
        size: 672379,
        name: 'sample_file_2_name.fig',
        type: 'fig',
      },
    },
    {
      id: 5,
      trashed: 'Jul 03, 2022 08:13:00',
      isFolder: true,
      item: {
        size: null,
        name: 'A folder',
        type: null,
      },
    },
    {
      id: 6,
      trashed: 'Jul 01, 2022 11:00:00',
      isFolder: false,
      item: {
        size: 2837629,
        name: 'example_file.jpg',
        type: 'jpg',
      },
    },
    {
      id: 7,
      trashed: 'Jun 29, 2022 10:00:00',
      isFolder: false,
      item: {
        size: 287334,
        name: 'example_code.js',
        type: 'js',
      },
    },
    {
      id: 8,
      trashed: 'Jun 26, 2022 15:00:00',
      isFolder: true,
      item: {
        size: null,
        name: 'Example folder 2',
        type: null,
      },
    },
  ];

  // Item dropdown menu
  const itemMenu = [
    {
      name: 'Restore',
      icon: ClockCounterClockwise,
      action: function (props) {
        alert('This action should show "move" dialog to restore item');
      },
    },
    {
      name: 'Delete permanently',
      icon: Trash,
      action: function (props) {
        alert('This action should show "delete permanently" dialog');
      },
    },
  ];

  return (
    <div className="flex w-full flex-shrink-0 flex-col">
      {/* Top action bar */}
      <div className="flex h-14 w-full flex-shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <p className="text-lg">{i18n.get('trash.trash')}</p>
        </div>

        {/* Delete selected items */}
        <div className="flex flex-row items-center">
          <BaseButton
            className="tertiary squared"
            disabled={!(selectedItems.length > 0)}
            onClick={() => alert('This should open "move" dialog')}
          >
            <ClockCounterClockwise size={24} />
          </BaseButton>

          <BaseButton
            className="tertiary squared"
            disabled={!(items.length > 0)}
            onClick={() => {
              if (selectedItems.length > 0) {
                alert('This should open "delete permanently" dialog');
              } else {
                alert('This should open "empty trash" dialog');
              }
            }}
          >
            <Trash size={24} />
          </BaseButton>
        </div>
      </div>

      {/* Link list */}
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List
          header={header}
          items={items}
          itemComposition={[...listItemComposition]}
          skinSkeleton={skinSkeleton}
          emptyState={emptyState}
          menu={itemMenu}
          selectedItems={setSelectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          disableKeyboardShortcuts={deleteDialogIsOpen || emptyTrashDialogIsOpen}
        />
        {/* <Grid
          header={header}
          items={items}
          itemComposition={gridItemComposition}
          skinSkeleton={skinSkeleton}
          emptyState={emptyState}
          menu={itemMenu}
          selectedItems={setSelectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          disableKeyboardShortcuts={deleteDialogIsOpen || emptyTrashDialogIsOpen}
        /> */}
      </div>

      {/* Dialogs */}
    </div>
  );
}
