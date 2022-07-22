// import { useAppDispatch } from '../../../store/hooks';
import i18n from 'app/i18n/services/i18n.service';
import dateService from '../../../core/services/date.service';
import BaseButton from '../../../shared/components/forms/BaseButton';
import { Trash, Link, ToggleRight, LinkBreak, Terminal } from 'phosphor-react';
import List from '../../../shared/components/List';
import { Dialog, Transition } from '@headlessui/react';
import { useState, Fragment, useEffect, useRef } from 'react';
import iconService from '../../../drive/services/icon.service';
import Empty from '../../../shared/components/Empty/Empty';
import emptyStateIcon from 'assets/icons/file-types/default.svg';
import shareService from 'app/share/services/share.service';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';

export default function SharedLinksView(): JSX.Element {
  const perPage = 2;
  const [page, setPage] = useState<number>(1);
  const [optionsDialogIsOpen, setOptionsDialogIsOpen] = useState(false);
  const [linkLimitTimes, setLinkLimitTimes] = useState(false);
  const [linkSettingsItem, setLinkSettingsItem] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [shareLinks, setShareLinks] = useState<any>([]);

  useEffect(() => {
    // setPage(1); // TODO: if im set page to 1, it will need click 2 times to next page to load 2 page.
    getShareLinks();
  }, [page]);

  const getShareLinks = async () => {
    const links: any = await shareService.getAllShareLinks(page, perPage);
    setShareLinks([...shareLinks, ...links.items]);
    console.log('items', links);
    console.log('sharelinks', [...shareLinks, ...links.items]);
  };

  const nextPage = () => {
    setPage(page + 1);
  };

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
        <div className="flex w-full flex-row items-center space-x-4 overflow-hidden">
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

  // Item dropdown menu
  const itemMenu = [
    {
      name: i18n.get('shared-links.item-menu.copy-link'),
      icon: Link,
      action: function (props) {
        alert('This action should copy link to clipboard');
      },
      disabled: function (props, selected): boolean {
        return false; // If item is selected and link is active
      },
    },
    {
      name: i18n.get('shared-links.item-menu.link-settings'),
      icon: ToggleRight,
      action: function (props) {
        openLinkSettings(props);
      },
      disabled: function (props, selected): boolean {
        return false; // If item is selected and link is active
      },
    },
    {
      name: i18n.get('shared-links.item-menu.delete-link'),
      icon: LinkBreak,
      action: function (props) {
        alert('This action should delete link');
      },
      disabled: function (props, selected): boolean {
        return false; // If item is selected and link is active
      },
    },
  ];

  // item dropdown custom funtions
  const openLinkSettings = (props) => {
    setLinkSettingsItem(props);
    setLinkLimitTimes(props.timesValid && props.timesValid > 0);
    setOptionsDialogIsOpen(true);
  };

  return (
    <div className="flex w-full flex-shrink-0 flex-col">
      {/* Top action bar */}
      <div className="flex h-14 w-full flex-shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <p className="text-lg">{i18n.get('shared-links.shared-links')}</p>
        </div>

        {/* Delete selected items */}
        <div className="flex flex-row items-center">
          <BaseButton className="tertiary space-x-2 whitespace-nowrap px-4" onClick={() => getShareLinks()}>
            <Terminal size={24} />
            <span>Load links</span>
          </BaseButton>

          <BaseButton className="tertiary space-x-2 whitespace-nowrap px-4" onClick={() => nextPage()}>
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
          items={[]}
          itemComposition={[...itemComposition]}
          skinSkeleton={skinSkeleton}
          emptyState={emptyState}
          menu={itemMenu}
          selectedItems={setSelectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          disableKeyboardShortcuts={optionsDialogIsOpen}
        />
      </div>

      {/* Dialogs */}
      <Transition appear show={optionsDialogIsOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 select-none"
          open={optionsDialogIsOpen}
          onClose={() => setOptionsDialogIsOpen(false)}
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
            <div className="fixed inset-0 bg-gray-100 bg-opacity-50" />
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
                  <Dialog.Title as="h3" className="flex flex-col text-2xl text-gray-80">
                    <span className="font-medium">Share settings</span>
                    <span className="truncate whitespace-nowrap text-base text-gray-40">
                      {linkSettingsItem?.item.name}
                    </span>
                  </Dialog.Title>

                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-gray-80">Views</span>
                    <span className="text-gray-60">{`Link visited ${linkSettingsItem?.views} times`}</span>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <span className="text-lg font-semibold text-gray-80">Options</span>
                    <div className="flex flex-row space-x-3">
                      <BaseCheckbox
                        checked={linkLimitTimes}
                        onClick={() => setLinkLimitTimes(!linkLimitTimes)}
                        className="mt-1"
                      />
                      <div className={`mb-3 flex flex-col ${!linkLimitTimes && 'pointer-events-none opacity-50'}`}>
                        {linkLimitTimes ? (
                          <div className="text flex flex-row items-center text-base font-medium">
                            <span>Open limit</span>
                            <div className="mx-1.5 flex h-6 flex-row items-center">
                              <input
                                type="number"
                                min={linkSettingsItem?.timesValid ?? 1}
                                max="9999"
                                step="1"
                                placeholder={linkSettingsItem?.timesValid}
                                disabled={!linkLimitTimes}
                                className="outline-none w-14 rounded-md border border-gray-20 py-0 px-2 text-right text-base focus:border-primary focus:ring-3 focus:ring-primary focus:ring-opacity-10"
                              />
                            </div>
                            <span>times</span>
                          </div>
                        ) : (
                          <div className="text flex flex-row items-center space-x-1 text-base">
                            <span className="font-medium">Open limit is off</span>
                            <span className="text-gray-40">(Unlimited views)</span>
                          </div>
                        )}
                        <span className="text-gray-40">Limit number of times users can open this link</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row justify-between">
                    <BaseButton
                      onClick={() => setOptionsDialogIsOpen(false)}
                      className="flex h-auto flex-row items-center space-x-2 rounded-lg border border-primary py-0 px-4 font-medium text-primary hover:bg-primary hover:bg-opacity-5 active:border-primary-dark"
                    >
                      <span>Copy link</span>
                      <Link size={24} />
                    </BaseButton>

                    <div className="flex flex-row space-x-2">
                      <BaseButton
                        onClick={() => setOptionsDialogIsOpen(false)}
                        className="flex h-auto flex-row items-center rounded-lg bg-primary py-0 px-4 font-medium text-white hover:bg-primary-dark"
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
