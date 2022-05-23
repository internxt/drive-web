import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Camera, Image } from 'phosphor-react';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Button from '../../../../../shared/components/Button/Button';
import Avatar from '../../../../../shared/components/Avatar';
import Modal from '../../../../../shared/components/Modal';
import { RootState } from '../../../../../store';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';

import type AvatarEditorType from 'react-avatar-editor';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import { updateUserAvatarThunk } from '../../../../../store/slices/user';
import { useAppDispatch } from '../../../../../store/hooks';
const AvatarEditor = lazy(() => import('react-avatar-editor'));

export default function UserHeader({ className = '' }: { className?: string }): JSX.Element {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  if (!user) throw new Error('User is not defined');

  const fullName = `${user.name} ${user.lastname}`;

  const [openModal, setOpenModal] = useState(false);

  return (
    <div className={`${className} flex h-44 flex-col items-center p-5`}>
      <div className="relative cursor-pointer" onClick={() => setOpenModal(true)}>
        <Avatar diameter={80} fullName={fullName} src={user.avatar} />
        <div className="absolute right-0 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-3 border-white bg-gray-5 text-gray-60">
          <Camera size={16} />
        </div>
      </div>

      <h1 className="mt-3 text-xl font-medium text-gray-80">{fullName}</h1>
      <h2 className="leading-tight text-gray-50">{user.email}</h2>
      <UploadAvatarModal isOpen={openModal} onClose={() => setOpenModal(false)} />
    </div>
  );
}

function UploadAvatarModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AvatarEditorType>(null);
  const [state, setState] = useState<
    { tag: 'empty' } | { tag: 'editing' | 'loading' | 'error'; source: File; zoom: number }
  >({ tag: 'empty' });

  useEffect(() => {
    if (isOpen) setState({ tag: 'empty' });
  }, [isOpen]);

  function validateFile(file: File) {
    if (file.size > 1024 * 1024 * 10) {
      notificationsService.show({ type: ToastType.Error, text: 'Please choose an image under 10MB of size' });
    } else {
      setState({ tag: 'editing', source: file, zoom: 1 });
    }
  }
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    const file = e.target.files?.[0];

    if (file) {
      validateFile(file);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];

    if (file) {
      validateFile(file);
    }
  }

  async function onSave() {
    if (state.tag === 'empty') return;

    setState({ ...state, tag: 'loading' });

    try {
      const avatarBlob = await new Promise<Blob>((resolve, reject) =>
        editorRef.current?.getImageScaledToCanvas().toBlob((blob) => (blob ? resolve(blob) : reject())),
      );

      await dispatch(updateUserAvatarThunk({ avatar: avatarBlob })).unwrap();

      notificationsService.show({ type: ToastType.Success, text: 'Avatar has been successfully updated' });
      onClose();
    } catch (err) {
      console.error(err);
      notificationsService.show({ type: ToastType.Error, text: 'Something happened while uploading your avatar' });
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h1 className="text-2xl font-medium text-gray-80">Upload avatar</h1>
      <div className="mt-4">
        {state.tag !== 'empty' ? (
          <div>
            <Suspense fallback={<Spinner className="mx-auto mt-4 h-10 w-10" />}>
              <AvatarEditor
                ref={editorRef}
                scale={state.zoom}
                className="mx-auto"
                image={state.source}
                width={320}
                height={320}
              />
              <div className="mt-1 flex justify-center">
                <input
                  className="mx-auto"
                  type="range"
                  min={1}
                  max={2}
                  step={0.01}
                  defaultValue={1}
                  onChange={(e) => setState({ ...state, zoom: parseFloat(e.target.value) })}
                />
              </div>
            </Suspense>
          </div>
        ) : (
          <>
            <input accept="image/*" ref={inputRef} className="hidden" type="file" onChange={onInputChange} />
            <div
              className="flex h-32 w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-10"
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => {
                e.stopPropagation();
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
            >
              <div className="text-gray-20 hover:text-gray-30">
                <Image className="mx-auto" weight="light" size={80} />
                <p className="font-medium">Select or drop a picture</p>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="flex">
          {state.tag === 'empty' ? (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setState({ tag: 'empty' })} disabled={state.tag === 'loading'}>
              Back
            </Button>
          )}
          {state.tag !== 'empty' && (
            <Button loading={state.tag === 'loading'} className="ml-2" onClick={onSave}>
              Save
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
