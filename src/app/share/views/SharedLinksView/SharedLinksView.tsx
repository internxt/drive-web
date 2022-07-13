// import { useAppDispatch } from '../../../store/hooks';
import i18n from 'app/i18n/services/i18n.service';
import dateService from '../../../core/services/date.service';
import BaseButton from '../../../shared/components/forms/BaseButton';
import { Trash } from 'phosphor-react';
import List from '../../../shared/components/List';
import { useState } from 'react';
import iconService from '../../../drive/services/icon.service';
// import { sharedActions, sharedThunks } from 'app/store/slices/sharedLinks';

export default function SharedLinksView(): JSX.Element {
  // const dispatch = useAppDispatch();
  // const links = dispatch(sharedThunks.fetchSharedLinksThunk());
  const [selectedItems, setSelectedItems] = useState([]);
  const header = [
    {
      name: i18n.get('shared-links.list.link-content'),
      width: 'flex-1 min-w-104',
      data: 'item.name',
      order: function (a, b) {
        return a.name > b.name ? 1 : -1;
      },
    },
    {
      name: i18n.get('shared-links.list.shared'),
      width: 'w-56',
      data: 'views',
      order: function (a, b) {
        return a.views > b.views ? 1 : -1;
      },
    },
    {
      name: i18n.get('shared-links.list.created'),
      width: 'w-60',
      data: 'createdAt',
      order: function (a, b) {
        return new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1;
      },
      defaultDirection: 'asc',
    },
  ];

  const itemComposition = [
    (props) => {
      const Icon = iconService.getItemIcon(props.isFolder, props.item.type);
      return (
        <div className="flex w-full flex-row items-center space-x-4 overflow-hidden">
          <Icon className="flex h-8 w-8 flex-shrink-0 drop-shadow-soft filter" />
          <span className="w-full max-w-full flex-1 flex-row truncate whitespace-nowrap pr-16">{props.item.name}</span>
        </div>
      );
    },
    (props, active) => (
      <span className={`${active ? 'text-primary' : 'text-gray-60'}`}>{`${props.views}${
        props.timesValid ? `/${props.timesValid}` : ''
      } views`}</span>
    ),
    (props, active) => (
      <span className={`${active ? 'text-primary' : 'text-gray-60'}`}>
        {dateService.format(props.createdAt, 'D MMM YYYY')}
      </span>
    ),
  ];

  const skinSkeleton = [
    <div className="flex flex-row items-center space-x-4">
      <div className="h-8 w-8 rounded-md bg-gray-5" />
      <div className="h-4 w-40 rounded bg-gray-5" />
    </div>,
    <div className="h-4 w-20 rounded bg-gray-5" />,
    <div className="h-4 w-24 rounded bg-gray-5" />,
  ];

  const items = [
    {
      id: 1,
      views: 12,
      timesVaslid: 15,
      createdAt: 'Jul 10, 2022 08:00:00',
      isFolder: false,
      item: {
        name: 'sample_file_name.pdf',
        type: 'pdf',
      },
    },
    {
      id: 2,
      views: 114,
      createdAt: 'Jul 11, 2022 07:00:00',
      isFolder: false,
      item: {
        name: 'sample_file_10_with_a_veeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeery_laaaaaaaaaaaaaaaaaaaaaaaaaaarge_name.png',
        type: 'png',
      },
    },
    {
      id: 3,
      views: 2,
      timesValid: 2,
      createdAt: 'Jul 07, 2022 09:00:00',
      isFolder: false,
      item: {
        name: 'smaple_js_file.js',
        type: 'js',
      },
    },
    {
      id: 4,
      views: 63,
      createdAt: 'Jul 12, 2022 08:00:00',
      isFolder: false,
      item: {
        name: 'sample_file_2_name.fig',
        type: 'fig',
      },
    },
    {
      id: 5,
      views: 8,
      timesValid: 10,
      createdAt: 'Jul 03, 2022 08:13:00',
      isFolder: true,
      item: {
        name: 'A folder',
        type: '',
      },
    },
    {
      id: 6,
      views: 26,
      timesValid: 32,
      createdAt: 'Jul 01, 2022 11:00:00',
      isFolder: false,
      item: {
        name: 'example_file.jpg',
        type: 'jpg',
      },
    },
  ];

  // const itemOptions = [
  //   {
  //     name: 'Copy link',
  //     action: function (props) {
  //       console.log('Open rename dialog');
  //     },
  //   },
  // ];

  return (
    <div className="flex w-full flex-shrink-0 flex-col">
      {/* Top action bar */}
      <div className="flex h-14 w-full flex-shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <p className="text-lg">{i18n.get('shared-links.shared-links')}</p>
        </div>

        {/* Delete selected items */}
        <div className="flex flex-row items-center">
          <BaseButton className="tertiary squared" disabled={!(selectedItems.length > 0)}>
            <Trash size={24} />
          </BaseButton>
        </div>
      </div>

      {/* Link list */}
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List
          header={header}
          items={items}
          itemComposition={[...itemComposition]}
          skinSkeleton={skinSkeleton}
          selectedItems={setSelectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll']}
        />
      </div>
    </div>
  );
}
