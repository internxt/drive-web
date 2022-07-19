// import { useAppDispatch } from '../../../store/hooks';
import i18n from 'app/i18n/services/i18n.service';
import dateService from '../../../core/services/date.service';
import BaseButton from '../../../shared/components/forms/BaseButton';
import { Trash, Link, ToggleRight, LinkBreak, Check, Terminal } from 'phosphor-react';
import List from '../../../shared/components/List';
import { Dialog, Transition } from '@headlessui/react';
import { useState, Fragment, useEffect } from 'react';
import iconService from '../../../drive/services/icon.service';
import Empty from '../../../shared/components/Empty/Empty';
import emptyStateIcon from 'assets/icons/file-types/default.svg';
import shareService from 'app/share/services/share.service';
// import { sharedActions, sharedThunks } from 'app/store/slices/sharedLinks';

export default function SharedLinksView(): JSX.Element {
  // const dispatch = useAppDispatch();
  // const links = dispatch(sharedThunks.fetchSharedLinksThunk());
  const perPage = 25;
  const [page, setPage] = useState<number>(1);
  const [optionsDialogIsOpen, setOptionsDialogIsOpenIsOpen] = useState(false);
  const [linkLimitTimes, setLinkLimitTimes] = useState(false);
  const [linkSettingsItem, setLinkSettingsItem] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [items, setItems] = useState<any>([]);

  useEffect(() => {
    setPage(2); // TODO: if im set page to 1, it will need click 2 times to next page to load 2 page.
    loadItems();
  }, []);

  // List header columns
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
      width: 'w-52',
      data: 'views',
      order: function (a, b) {
        return a.views > b.views ? 1 : -1;
      },
    },
    {
      name: i18n.get('shared-links.list.created'),
      width: 'w-40',
      data: 'createdAt',
      order: function (a, b) {
        return new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1;
      },
      defaultDirection: 'asc',
    },
  ];

  // Composition of the item (content per item column)
  const itemComposition = [
    (props) => {
      const Icon = iconService.getItemIcon(props.isFolder, props.item.type);
      return (
        <div className="w- flex w-full flex-row items-center space-x-4 overflow-hidden">
          <Icon className="flex h-8 w-8 flex-shrink-0 drop-shadow-soft filter" />
          <span className="w-full max-w-full flex-1 flex-row truncate whitespace-nowrap pr-16">{props.item.name}</span>
        </div>
      );
    },
    (props, selected) => (
      <span className={`${selected ? 'text-primary' : 'text-gray-60'}`}>{`${props.views}${
        props.timesValid ? `/${props.timesValid}` : ''
      } views`}</span>
    ),
    (props, selected) => (
      <span className={`${selected ? 'text-primary' : 'text-gray-60'}`}>
        {dateService.format(props.createdAt, 'D MMM YYYY')}
      </span>
    ),
  ];

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
        <div className="relative">
          <img className="w-36" alt="" src={emptyStateIcon} />
          <div className=" absolute -bottom-1 right-2 flex h-10 w-10 flex-col items-center justify-center rounded-full bg-primary text-white shadow-subtle-hard ring-8 ring-primary ring-opacity-10">
            <Link size={24} />
          </div>
        </div>
      }
      title={i18n.get('shared-links.empty-state.title')}
      subtitle={i18n.get('shared-links.empty-state.subtitle')}
    />
  );

  // Item list
  // const items = [
  //   {
  //     id: 1,
  //     views: 12,
  //     timesVaslid: 15,
  //     createdAt: 'Jul 10, 2022 08:00:00',
  //     isFolder: false,
  //     item: {
  //       name: 'sample_file_name.pdf',
  //       type: 'pdf',
  //     },
  //   },
  //   {
  //     id: 2,
  //     views: 114,
  //     createdAt: 'Jul 11, 2022 07:00:00',
  //     isFolder: false,
  //     item: {
  //       name: 'sample_file_10_with_a_veeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeery_laaaaaaaaaaaaaaaaaaaaaaaaaaarge_name.png',
  //       type: 'png',
  //     },
  //   },
  //   {
  //     id: 3,
  //     views: 2,
  //     timesValid: 2,
  //     createdAt: 'Jul 07, 2022 09:00:00',
  //     isFolder: false,
  //     item: {
  //       name: 'smaple_js_file.js',
  //       type: 'js',
  //     },
  //   },
  //   {
  //     id: 4,
  //     views: 63,
  //     createdAt: 'Jul 12, 2022 08:00:00',
  //     isFolder: false,
  //     item: {
  //       name: 'sample_file_2_name.fig',
  //       type: 'fig',
  //     },
  //   },
  //   {
  //     id: 5,
  //     views: 8,
  //     timesValid: 10,
  //     createdAt: 'Jul 03, 2022 08:13:00',
  //     isFolder: true,
  //     item: {
  //       name: 'A folder',
  //       type: '',
  //     },
  //   },
  //   {
  //     id: 6,
  //     views: 26,
  //     timesValid: 32,
  //     createdAt: 'Jul 01, 2022 11:00:00',
  //     isFolder: false,
  //     item: {
  //       name: 'example_file.jpg',
  //       type: 'jpg',
  //     },
  //   },
  // ];


  const loadItems = async () => {
    const items = await shareService.getAllShareLinks(page, perPage);
    setItems(items);
  };

  const nextPage = () => {
    setPage(page + 1);
    loadItems();
  };


  // item dropdown custom funtions
  const openLinkSettings = (props) => {
    setOptionsDialogIsOpenIsOpen(true);
    setLinkSettingsItem(props);
  };

  // Item dropdown menu
  const itemMenu = [
    {
      name: 'Copy link',
      icon: Link,
      action: function (props) {
        alert('This action should copy link to clipboard');
      },
      disabled: function (props, selected): boolean {
        return false; // If item is selected and link is active
      },
    },
    {
      name: 'Link settings',
      icon: ToggleRight,
      action: function (props) {
        openLinkSettings(props);
      },
      disabled: function (props, selected): boolean {
        return false; // If item is selected and link is active
      },
    },
    {
      name: 'Delete link',
      icon: LinkBreak,
      action: function (props) {
        alert('This action should delete link');
      },
      disabled: function (props, selected): boolean {
        return false; // If item is selected and link is active
      },
    },
  ];

 

  return (
    <div className="flex w-full flex-shrink-0 flex-col">
      {/* Top action bar */}
      <div className="flex h-14 w-full flex-shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <p className="text-lg">{i18n.get('shared-links.shared-links')}</p>
        </div>

        {/* Delete selected items */}
        <div className="flex flex-row items-center">
          <BaseButton
            className="tertiary space-x-2 whitespace-nowrap px-4"
            onClick={() => loadItems()}
          >
            <Terminal size={24} />
            <span>Load links</span>
          </BaseButton>

          <BaseButton
            className="tertiary space-x-2 whitespace-nowrap px-4"
            onClick={() => nextPage()}
          >
            <Terminal size={24} />
            <span>Pagination</span>
          </BaseButton>

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
          emptyState={emptyState}
          menu={itemMenu}
          selectedItems={setSelectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll']}
          disableKeyboardShortcuts={optionsDialogIsOpen}
        />
      </div>

      {/* Dialogs */}
      <Transition appear show={optionsDialogIsOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 select-none"
          open={optionsDialogIsOpen}
          onClose={() => setOptionsDialogIsOpenIsOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-100 bg-opacity-40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="flex w-full max-w-lg transform flex-col space-y-5 overflow-hidden rounded-2xl bg-white p-5 text-left align-middle shadow-subtle-hard transition-all">
                  <Dialog.Title as="h3" className="text-2xl font-medium text-gray-80">
                    Link settings
                  </Dialog.Title>

                  <div className="flex flex-col space-y-1.5">
                    <span className="font-medium text-gray-80">Views</span>
                    <div className="flex flex-row rounded-lg bg-gray-1 p-4">{`Link visited ${linkSettingsItem?.views} times`}</div>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <span className="font-medium text-gray-80">Options</span>
                    <div className="flex flex-row space-x-3">
                      <div
                        onClick={() => setLinkLimitTimes(!linkLimitTimes)}
                        className={`mt-1 flex h-5 w-5 cursor-pointer flex-col items-center justify-center rounded text-white ${
                          linkLimitTimes ? 'bg-primary' : 'border border-gray-20'
                        }`}
                      >
                        <Check size={16} weight="bold" />
                      </div>
                      <div className="mb-3 flex flex-col">
                        <div className="flex flex-row items-center text-lg font-medium">
                          <span>Open limit</span>
                          <div className="mx-1.5 flex max-h-full flex-row items-center">
                            <input
                              type="number"
                              min="0"
                              max="9999"
                              step="1"
                              className="w-16 rounded-md border border-gray-20 py-0 px-2 text-right text-lg"
                            />
                          </div>
                          <span>times</span>
                        </div>
                        <span className="text-gray-40">Limit number of times users can open this link</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row justify-between">
                    <BaseButton
                      onClick={() => setOptionsDialogIsOpenIsOpen(false)}
                      className="flex h-10 flex-row items-center space-x-2 rounded-lg bg-primary bg-opacity-10 px-5 font-medium text-primary active:bg-opacity-15"
                    >
                      <span>Copy link</span>
                      <Link size={24} />
                    </BaseButton>

                    <div className="flex flex-row space-x-2">
                      <BaseButton
                        onClick={() => setOptionsDialogIsOpenIsOpen(false)}
                        className="flex h-10 flex-row items-center rounded-lg bg-gray-5 px-5 font-medium text-gray-80 active:bg-gray-10"
                      >
                        Cancel
                      </BaseButton>
                      <BaseButton
                        onClick={() => setOptionsDialogIsOpenIsOpen(false)}
                        className="flex h-10 flex-row items-center rounded-lg bg-primary px-5 font-medium text-white active:bg-primary-dark"
                      >
                        Save
                      </BaseButton>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
