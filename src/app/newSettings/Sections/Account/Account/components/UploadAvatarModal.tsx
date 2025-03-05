import { Image } from '@phosphor-icons/react';
import { Suspense, useEffect, useRef, useState } from 'react';
import AvatarEditor from 'react-avatar-editor';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import { Button, Loader } from '@internxt/ui';
import Modal from '../../../../../shared/components/Modal';

interface UploadAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadAvatarClicked: ({ avatar }: { avatar: Blob }) => Promise<void>;
  displayFileLimitMessage: () => void;
  onSavingAvatarError: (error: unknown) => void;
}
const UploadAvatarModal = ({
  isOpen,
  onClose,
  onUploadAvatarClicked,
  displayFileLimitMessage,
  onSavingAvatarError,
}: UploadAvatarModalProps) => {
  const { translate } = useTranslationContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AvatarEditor>(null);
  const [state, setState] = useState<
    { tag: 'empty' } | { tag: 'editing' | 'loading' | 'error'; source: File; zoom: number }
  >({ tag: 'empty' });

  useEffect(() => {
    if (isOpen) setState({ tag: 'empty' });
  }, [isOpen]);

  const validateFile = (file: File) => {
    if (file.size > 1024 * 1024 * 10) {
      displayFileLimitMessage();
    } else {
      setState({ tag: 'editing', source: file, zoom: 1 });
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];

    if (file) {
      validateFile(file);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];

    if (file) {
      validateFile(file);
    }
  };

  const onSave = async () => {
    if (state.tag === 'empty') return;

    setState({ ...state, tag: 'loading' });

    try {
      const avatarBlob = await new Promise<Blob>((resolve, reject) =>
        editorRef.current
          ?.getImageScaledToCanvas()
          .toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Error getting avatar image')))),
      );

      await onUploadAvatarClicked({ avatar: avatarBlob });

      onClose();
    } catch (error) {
      onSavingAvatarError(error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h1 className="text-2xl font-medium text-gray-80">{translate('views.account.avatar.title')}</h1>
      <div className="mt-4">
        {state.tag !== 'empty' ? (
          <div>
            <Suspense fallback={<Loader classNameLoader="mx-auto mt-4 h-10 w-10" />}>
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
                  disabled={state.tag === 'loading'}
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
              role="button"
              tabIndex={0}
              onKeyDown={() => inputRef.current?.click()}
            >
              <div className="text-gray-20 hover:text-gray-30">
                <Image className="mx-auto" weight="light" size={80} />
                <p className="font-medium">{translate('views.account.avatar.dragNDrop')}</p>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="flex">
          {state.tag === 'empty' ? (
            <Button variant="secondary" onClick={onClose}>
              {translate('actions.cancel')}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setState({ tag: 'empty' })} disabled={state.tag === 'loading'}>
              {translate('actions.back')}
            </Button>
          )}
          {state.tag !== 'empty' && (
            <Button loading={state.tag === 'loading'} className="ml-2" onClick={onSave}>
              {translate('actions.save')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default UploadAvatarModal;
