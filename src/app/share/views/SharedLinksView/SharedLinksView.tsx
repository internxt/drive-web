import i18n from 'app/i18n/services/i18n.service';
import dateService from 'app/core/services/date.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { Trash, Link, ToggleRight, LinkBreak } from 'phosphor-react';
import List from 'app/shared/components/List';
import { Dialog, Transition } from '@headlessui/react';
import { useState, Fragment, useEffect } from 'react';
import iconService from 'app/drive/services/icon.service';
import copy from 'copy-to-clipboard';
import Empty from 'app/shared/components/Empty/Empty';
import emptyStateIcon from 'assets/icons/file-types/default.svg';
import shareService from 'app/share/services/share.service';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import _ from 'lodash';
import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData } from '../../../drive/types';

type OrderBy = { field: 'views' | 'createdAt'; direction: 'ASC' | 'DESC' } | undefined;

export default function SharedLinksView(): JSX.Element {
  const ITEMS_PER_PAGE = 64;

  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<OrderBy>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [optionsDialogIsOpen, setOptionsDialogIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ListShareLinksItem[]>([]);
  const [shareLinks, setShareLinks] = useState<ListShareLinksItem[]>([]);

  const [savingLinkChanges, setSavingLinkChanges] = useState<boolean>(false);
  const [linkLimitTimes, setLinkLimitTimes] = useState(false);
  const [linkSettingsItem, setLinkSettingsItem] = useState<any>(null);
  const [linkSettingsTimesValid, setLinkSettingsTimesValid] = useState<number>(0);

  function isItemSelected(item: ListShareLinksItem) {
    return selectedItems.some((i) => item.id === i.id);
  }

  function isItemExpired(item: ListShareLinksItem) {
    return item.timesValid !== null && item.views >= item.timesValid;
  }

  useEffect(() => {
    fetchItems(page, orderBy, 'append');
  }, []);

  async function fetchItems(page: number, orderBy: OrderBy, type: 'append' | 'substitute') {
    setIsLoading(true);

    const response = await shareService.getAllShareLinks(
      page,
      ITEMS_PER_PAGE,
      orderBy ? `${orderBy.field}:${orderBy.direction}` : undefined,
    );
    setHasMoreItems(ITEMS_PER_PAGE * page < response.pagination.countAll);
    setOrderBy(orderBy);
    setIsLoading(false);
    setPage(page);
    if (type == 'append') {
      setShareLinks([...shareLinks, ...response.items]);
    } else {
      setShareLinks(response.items);
    }
  }

  function updateLinkItem(item: ListShareLinksItem) {
    const index = shareLinks.findIndex((i) => item.id === i.id);
    const updatedList = shareLinks;
    updatedList[index] = item;
    setShareLinks(updatedList);
  }

  function onNextPage() {
    fetchItems(page + 1, orderBy, 'append');
  }

  function onOrderByChanged(newOrderBy: OrderBy) {
    fetchItems(0, newOrderBy, 'substitute');
  }

  function copyShareLink(token: string) {
    copy(`${document.location.origin}/s/file/${token}/`);
    notificationsService.show({ text: i18n.get('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
  }

  async function updateShareLink(params: ShareTypes.UpdateShareLinkPayload) {
    setSavingLinkChanges(true);
    const updatedItem = await shareService.updateShareLink(params);
    updateLinkItem(updatedItem);
    setLinkSettingsItem(updatedItem);
    setSavingLinkChanges(false);
    notificationsService.show({ text: i18n.get('shared-links.toast.link-updated'), type: ToastType.Success });
  }

  async function deleteShareLink(shareId: string) {
    await shareService.deleteShareLink(shareId);
    setShareLinks((items) => items.filter((item) => item.id !== shareId));
    setSelectedItems((items) => items.filter((item) => item.id !== shareId));
  }

  async function deleteSelectedItems() {
    const CHUNK_SIZE = 10;

    const chunks = _.chunk(selectedItems, CHUNK_SIZE);
    for (const chunk of chunks) {
      const promises = chunk.map((item) => deleteShareLink(item.id));
      await Promise.all(promises);
    }

    notificationsService.show({ text: i18n.get('shared-links.toast.links-deleted'), type: ToastType.Success });
  }

  function onSelectedItemsChanged(changes: { props: ListShareLinksItem; value: boolean }[]) {
    let updatedSelectedItems = selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.props.id);
      if (change.value) {
        updatedSelectedItems = [...updatedSelectedItems, change.props];
      }
    }

    setSelectedItems(updatedSelectedItems);
  }

  const skinSkeleton = [
    <div className="flex flex-row items-center space-x-4">
      <div className="h-8 w-8 rounded-md bg-gray-5" />
      <div className="h-4 w-40 rounded bg-gray-5" />
    </div>,
    <div className="h-4 w-20 rounded bg-gray-5" />,
    <div className="h-4 w-24 rounded bg-gray-5" />,
  ];

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

  const openLinkSettings = (props) => {
    setLinkSettingsItem(props);
    setLinkLimitTimes(props.timesValid && props.timesValid > 0);
    setOptionsDialogIsOpen(true);
  };

  return (
    <div className="flex w-full flex-shrink-0 flex-col">
      <div className="flex h-14 w-full flex-shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <p className="text-lg">{i18n.get('shared-links.shared-links')}</p>
        </div>

        <div className="flex flex-row items-center">
          <BaseButton onClick={deleteSelectedItems} className="tertiary squared" disabled={!(selectedItems.length > 0)}>
            <Trash size={24} />
          </BaseButton>
        </div>
      </div>

      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<ListShareLinksItem, 'views' | 'createdAt'>
          header={[
            {
              label: i18n.get('shared-links.list.link-content'),
              width: 'flex-1 min-w-104',
              name: 'item',
              orderable: false,
            },
            {
              label: i18n.get('shared-links.list.shared'),
              width: 'w-52',
              name: 'views',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: i18n.get('shared-links.list.created'),
              width: 'w-40',
              name: 'createdAt',
              orderable: true,
              defaultDirection: 'ASC',
            },
          ]}
          items={shareLinks}
          isLoading={isLoading}
          itemComposition={[
            (props) => {
              const Icon = iconService.getItemIcon(props.isFolder, (props.item as DriveFileData).type);
              return (
                <div
                  className={`flex w-full flex-row items-center space-x-4 overflow-hidden ${
                    isItemExpired(props) && 'opacity-50'
                  }`}
                >
                  <Icon className="flex h-8 w-8 flex-shrink-0 drop-shadow-soft filter" />
                  <span className="w-full max-w-full flex-1 flex-row truncate whitespace-nowrap pr-16">{`${
                    (props.item as DriveFileData).name
                  }${
                    !props.isFolder && (props.item as DriveFileData).type
                      ? `.${(props.item as DriveFileData).type}`
                      : ''
                  }`}</span>
                </div>
              );
            },
            (props) => (
              <span
                className={`${isItemSelected(props) ? 'text-primary' : 'text-gray-60'} ${
                  isItemExpired(props) && 'opacity-50'
                }`}
              >{`${props.views}${props.timesValid !== null ? `/${props.timesValid}` : ''} views`}</span>
            ),
            (props) => (
              <span
                className={`${isItemSelected(props) ? 'text-primary' : 'text-gray-60'} ${
                  isItemExpired(props) && 'opacity-50'
                }`}
              >
                {dateService.format(props.createdAt, 'D MMM YYYY')}
              </span>
            ),
          ]}
          skinSkeleton={skinSkeleton}
          emptyState={emptyState}
          onNextPage={onNextPage}
          hasMoreItems={hasMoreItems}
          menu={[
            {
              name: i18n.get('shared-links.item-menu.copy-link'),
              icon: Link,
              action: (props) => {
                copyShareLink(props.token);
              },
              disabled: (props) => {
                return props.timesValid !== null && props.views >= props.timesValid;
              },
            },
            {
              name: i18n.get('shared-links.item-menu.link-settings'),
              icon: ToggleRight,
              action: openLinkSettings,
              disabled: (props) => {
                return false; // If item is selected and link is active
              },
            },
            {
              name: i18n.get('shared-links.item-menu.delete-link'),
              icon: LinkBreak,
              action: async (props) => {
                await deleteShareLink(props.id);
                notificationsService.show({
                  text: i18n.get('shared-links.toast.link-deleted'),
                  type: ToastType.Success,
                });
              },
              disabled: (props) => {
                return false; // If item is selected and link is active
              },
            },
          ]}
          selectedItems={selectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          disableKeyboardShortcuts={optionsDialogIsOpen}
          onOrderByChanged={onOrderByChanged}
          orderBy={orderBy}
          onSelectedItemsChanged={onSelectedItemsChanged}
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
                    <span className="font-medium">{i18n.get('shared-links.link-settings.share-settings')}</span>
                    <span className="truncate whitespace-nowrap text-base text-gray-40">
                      {`${linkSettingsItem?.item.name}${
                        linkSettingsItem?.item.type && `.${linkSettingsItem?.item.type}`
                      }`}
                    </span>
                  </Dialog.Title>

                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-gray-80">
                      {i18n.get('shared-links.link-settings.views')}
                    </span>
                    <span className="text-gray-60">{`Link visited ${linkSettingsItem?.views} times`}</span>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <span className="text-lg font-semibold text-gray-80">
                      {i18n.get('shared-links.link-settings.options')}
                    </span>
                    <div className="flex flex-row space-x-3">
                      <BaseCheckbox
                        checked={linkLimitTimes}
                        onClick={() => {
                          setLinkLimitTimes(!linkLimitTimes);
                        }}
                        className="mt-1"
                      />
                      <div className={`mb-3 flex flex-col ${!linkLimitTimes && 'pointer-events-none opacity-50'}`}>
                        {linkLimitTimes ? (
                          <div className="text flex flex-row items-center text-base font-medium">
                            <span>Open limit</span>
                            <div className="mx-1.5 flex h-6 flex-row items-center">
                              <input
                                type="number"
                                min={Math.max(linkSettingsItem?.timesValid ?? 1, linkSettingsItem?.views)}
                                max="9999"
                                step="1"
                                placeholder={Math.max(
                                  linkSettingsItem?.timesValid ?? 1,
                                  linkSettingsItem?.views,
                                ).toString()}
                                disabled={!linkLimitTimes}
                                onChange={(e) => setLinkSettingsTimesValid(parseInt(e.target.value))}
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
                      onClick={() => copyShareLink(linkSettingsItem?.token)}
                      disabled={
                        linkSettingsItem?.timesValid > 0 && linkSettingsItem?.views >= linkSettingsItem?.timesValid
                      }
                      className="flex h-auto flex-row items-center space-x-2 rounded-lg border border-primary py-0 px-4 font-medium text-primary hover:bg-primary hover:bg-opacity-5 active:border-primary-dark"
                    >
                      <span>{i18n.get('shared-links.link-settings.copy-link')}</span>
                      <Link size={24} />
                    </BaseButton>

                    <div className="flex flex-row space-x-2">
                      <BaseButton
                        onClick={() =>
                          updateShareLink({
                            itemId: linkSettingsItem?.id,
                            timesValid: linkLimitTimes ? linkSettingsTimesValid : -1,
                            active: true,
                          })
                        }
                        isLoading={savingLinkChanges}
                        className="flex h-auto flex-row items-center rounded-lg bg-primary py-0 px-4 font-medium text-white hover:bg-primary-dark"
                      >
                        {savingLinkChanges
                          ? i18n.get('shared-links.link-settings.saving')
                          : i18n.get('shared-links.link-settings.save')}
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
