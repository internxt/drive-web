import i18n from 'app/i18n/services/i18n.service';
import dateService from 'app/core/services/date.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { Trash, Link, ToggleRight, LinkBreak } from 'phosphor-react';
import List from 'app/shared/components/List';
import { Dialog, Transition } from '@headlessui/react';
import DeleteDialog from '../../../shared/components/Dialog/Dialog';
import { useState, Fragment, useEffect } from 'react';
import iconService from 'app/drive/services/icon.service';
import copy from 'copy-to-clipboard';
import Empty from 'app/shared/components/Empty/Empty';
import emptyStateIcon from 'assets/icons/file-types/default.svg';
import shareService from 'app/share/services/share.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import _ from 'lodash';
import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData } from '../../../drive/types';
import { aes } from '@internxt/lib';
import localStorageService from 'app/core/services/local-storage.service';

type OrderBy = { field: 'views' | 'createdAt'; direction: 'ASC' | 'DESC' } | undefined;

function copyShareLink(type: string, code: string, token: string) {
  copy(`${document.location.origin}/s/${type}/${token}/${code}`);
  notificationsService.show({ text: i18n.get('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
}

export default function SharedLinksView(): JSX.Element {
  const ITEMS_PER_PAGE = 10;

  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<OrderBy>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedItems, setSelectedItems] = useState<(ListShareLinksItem & { code: string })[]>([]);
  const [shareLinks, setShareLinks] = useState<(ListShareLinksItem & { code: string })[]>([]);

  const [confirmDeleteState, setConfirmDeleteState] = useState<
    { tag: 'single'; shareId: string } | { tag: 'multiple' } | { tag: 'closed' }
  >({ tag: 'closed' });

  const [isUpdateLinkModalOpen, setIsUpdateLinkModalOpen] = useState(false);
  const [linkToUpdate, setLinkToUpdate] = useState<(ListShareLinksItem & { code: string }) | undefined>(undefined);

  function closeConfirmDelete() {
    setConfirmDeleteState({ tag: 'closed' });
  }

  function isItemSelected(item: ListShareLinksItem) {
    return selectedItems.some((i) => item.id === i.id);
  }

  useEffect(() => {
    fetchItems(page, orderBy, 'append');
  }, []);

  async function fetchItems(page: number, orderBy: OrderBy, type: 'append' | 'substitute') {
    setIsLoading(true);

    const response: ShareTypes.ListShareLinksResponse = await shareService.getAllShareLinks(
      page,
      ITEMS_PER_PAGE,
      orderBy ? `${orderBy.field}:${orderBy.direction}` : undefined,
    );
    console.log(response.items);
    setHasMoreItems(ITEMS_PER_PAGE * page < response.pagination.countAll);
    setOrderBy(orderBy);
    setIsLoading(false);
    setPage(page);

    if (type === 'append') {
      setShareLinks([...shareLinks, ...response.items as (ListShareLinksItem & { code: string })[] ]);
    } else {
      setShareLinks(response.items as (ListShareLinksItem & { code: string })[]);
    }
  }

  function updateLinkItem(item: ListShareLinksItem & { code: string }) {
    const index = shareLinks.findIndex((i) => item.id === i.id);
    const updatedList = shareLinks;
    updatedList[index] = item;
    setShareLinks(updatedList);
    setIsUpdateLinkModalOpen(false);
  }

  function onNextPage() {
    fetchItems(page + 1, orderBy, 'append');
  }

  function onOrderByChanged(newOrderBy: OrderBy) {
    fetchItems(0, newOrderBy, 'substitute');
  }

  async function deleteShareLink(shareId: string) {
    await shareService.deleteShareLink(shareId);
    setShareLinks((items) => items.filter((item) => item.id !== shareId));
    setSelectedItems((items) => items.filter((item) => item.id !== shareId));
  }

  async function onDeleteShareLink(shareId: string) {
    await deleteShareLink(shareId);
    notificationsService.show({
      text: i18n.get('shared-links.toast.link-deleted'),
      type: ToastType.Success,
    });
    setConfirmDeleteState({ tag: 'closed' });
  }

  async function onDeleteSelectedItems() {
    const CHUNK_SIZE = 10;

    const chunks = _.chunk(selectedItems, CHUNK_SIZE);
    for (const chunk of chunks) {
      const promises = chunk.map((item) => deleteShareLink(item.id));
      await Promise.all(promises);
    }

    notificationsService.show({ text: i18n.get('shared-links.toast.links-deleted'), type: ToastType.Success });
    setConfirmDeleteState({ tag: 'closed' });
  }

  function onSelectedItemsChanged(changes: { props: ListShareLinksItem & { code: string }; value: boolean }[]) {
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

  function onOpenLinkUpdateModal(item: ListShareLinksItem & { code: string }) {
    const mnemonic = localStorageService.getUser()!.mnemonic;
    setLinkToUpdate(item);
    setIsUpdateLinkModalOpen(true);
  }

  return (
    <div className="flex w-full flex-shrink-0 flex-col">
      <div className="flex h-14 w-full flex-shrink-0 flex-row items-center px-5">
        <div className="flex w-full flex-row items-center">
          <p className="text-lg">{i18n.get('shared-links.shared-links')}</p>
        </div>

        <div className="flex flex-row items-center">
          <BaseButton
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteState({ tag: 'multiple' });
            }}
            className="tertiary squared"
            disabled={!(selectedItems.length > 0)}
          >
            <Trash size={24} />
          </BaseButton>
        </div>
      </div>

      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<ListShareLinksItem & { code: string }, 'views' | 'createdAt'>
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
                  className={'flex w-full flex-row items-center space-x-4 overflow-hidden cursor-pointer'}
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
                className={`${isItemSelected(props) ? 'text-primary' : 'text-gray-60'}`}
              >{`${props.views} views`}</span>
            ),
            (props) => (
              <span
                className={`${isItemSelected(props) ? 'text-primary' : 'text-gray-60'}`}
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
                const itemType = props.isFolder ? 'folder' : 'file';
                const encryptedCode = props.code;
                const plainCode = aes.decrypt(
                  encryptedCode, 
                  localStorageService.getUser()!.mnemonic
                );
                copyShareLink(itemType, plainCode, props.token);
              },
              disabled: () => {
                return false;
              }
            },
            /*{
              name: i18n.get('shared-links.item-menu.link-settings'),
              icon: ToggleRight,
              action: onOpenLinkUpdateModal,
              disabled: () => {
                return false; // If item is selected and link is active
              },
            },*/
            {
              name: i18n.get('shared-links.item-menu.delete-link'),
              icon: LinkBreak,
              action: async (props) => {
                setConfirmDeleteState({ tag: 'single', shareId: props.id });
              },
              disabled: () => {
                return false; // If item is selected and link is active
              },
            },
          ]}
          selectedItems={selectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          disableKeyboardShortcuts={isUpdateLinkModalOpen}
          onOrderByChanged={onOrderByChanged}
          orderBy={orderBy}
          onSelectedItemsChanged={onSelectedItemsChanged}
        />
      </div>

      <DeleteDialog
        isOpen={confirmDeleteState.tag !== 'closed'}
        onClose={closeConfirmDelete}
        onSecondaryAction={closeConfirmDelete}
        secondaryAction="Cancel"
        title={confirmDeleteState.tag === 'single' ? 'Delete link' : 'Delete links'}
        subtitle={
          confirmDeleteState.tag === 'single'
            ? 'Users with the link will lose access to the shared content'
            : 'Users with the links will lose access to the shared content'
        }
        onPrimaryAction={
          confirmDeleteState.tag === 'single'
            ? () => onDeleteShareLink(confirmDeleteState.shareId)
            : onDeleteSelectedItems
        }
        primaryAction={confirmDeleteState.tag === 'single' ? 'Delete link' : 'Delete links'}
        primaryActionColor="danger"
      />
      <UpdateLinkModal
        isOpen={isUpdateLinkModalOpen}
        onClose={() => setIsUpdateLinkModalOpen(false)}
        onShareUpdated={updateLinkItem}
        linkToUpdate={linkToUpdate!}
      />
    </div>
  );
}

function UpdateLinkModal({
  isOpen,
  onClose,
  onShareUpdated,
  linkToUpdate,
}: {
  isOpen: boolean;
  linkToUpdate: ListShareLinksItem & { code: string };
  onClose: () => void;
  onShareUpdated: (updatedItem: ListShareLinksItem & { code: string }) => void;
}) {
  const [savingLinkChanges, setSavingLinkChanges] = useState<boolean>(false);

  const item = linkToUpdate?.item as DriveFileData | undefined;

  useEffect(() => {
    if (isOpen) {
      setSavingLinkChanges(false);
    }
  }, [isOpen]);

  // Could be used for implementing an update of the Share Link if they have more features
  async function updateShareLink(params: ShareTypes.UpdateShareLinkPayload) {
    setSavingLinkChanges(true);
    const updatedItem = await shareService.updateShareLink(params);
    onShareUpdated(updatedItem as ShareTypes.ShareLink & { code: string });
    setSavingLinkChanges(false);
    //notificationsService.show({ text: i18n.get('shared-links.toast.link-updated'), type: ToastType.Success });
  }

  function copyLink() {
    const mnemonic = localStorageService.getUser()!.mnemonic;
    const link = shareService.buildLinkFromShare(mnemonic, linkToUpdate);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    copy(link);
    notificationsService.show({ text: i18n.get('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 select-none" open={isOpen} onClose={onClose}>
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
                    {`${item?.name}${(item?.type && item?.type !== 'folder' && `.${item?.type}` || '')}`}
                  </span>
                </Dialog.Title>

                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-gray-80">
                    {i18n.get('shared-links.link-settings.views')}
                  </span>
                  <span className="text-gray-60">{`Link visited ${linkToUpdate?.views} times`}</span>
                </div>



                <div className="flex flex-row justify-between">
                  <BaseButton
                    onClick={copyLink}
                    disabled={
                      false 
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
                          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                          itemId: linkToUpdate!.id,
                          timesValid: -1,
                          active: true,
                        })
                      }
                      isLoading={savingLinkChanges}
                      className="flex h-auto flex-row items-center rounded-lg bg-primary py-0 px-4 font-medium text-white hover:bg-primary-dark"
                    >
                      {i18n.get('shared-links.link-settings.close')}
                    </BaseButton>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
