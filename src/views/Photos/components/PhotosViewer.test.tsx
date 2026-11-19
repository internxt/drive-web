import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DriveItemData } from 'app/drive/types';
import { DownloadManager } from 'app/network/DownloadManager';
import { Photo } from '../types';
import PhotosViewer from './PhotosViewer';

vi.mock('app/network/DownloadManager', () => ({ DownloadManager: { downloadItem: vi.fn() } }));
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const mockViewerProps = vi.hoisted(() => vi.fn());
vi.mock('app/drive/components/FileViewer/FileViewerWrapper', () => ({
  default: (props: {
    onDownloadFile: (file: DriveItemData) => void;
    onLastFileReached?: () => void;
    keyboardShortcuts: { removeItemFromKeyboard: (file: DriveItemData) => void };
  }) => {
    mockViewerProps(props);
    return null;
  },
}));

const aPhoto = (name: string, type: string, relatedFiles: Photo[] = []): Photo =>
  ({
    uuid: name,
    name,
    type,
    relatedFiles,
    file: { uuid: name, name, type, isFolder: false } as DriveItemData,
  }) as unknown as Photo;

const downloadFromTheViewer = (photo: Photo) => {
  render(<PhotosViewer photo={photo} photos={[photo]} onClose={vi.fn()} onMoveToTrash={vi.fn()} />);
  mockViewerProps.mock.calls.at(-1)?.[0].onDownloadFile(photo.file);
  return vi.mocked(DownloadManager.downloadItem).mock.calls.at(-1)?.[0];
};

describe('Downloading a photo from the viewer', () => {
  test('When the photo is a single file, then it keeps the default name with its extension', () => {
    const download = downloadFromTheViewer(aPhoto('IMG_1', 'jpg'));

    expect(download?.payload).toHaveLength(1);
    expect(download?.downloadOptions?.downloadName).toBeUndefined();
  });

  test('When the photo has related files, then they are downloaded together in a zip named after the photo', () => {
    const livePhoto = aPhoto('IMG_2', 'heic', [aPhoto('IMG_2_video', 'mov')]);

    const download = downloadFromTheViewer(livePhoto);

    expect(download?.payload).toHaveLength(2);
    expect(download?.downloadOptions?.downloadName).toBe('IMG_2');
  });

  test('When the files have no numeric id, then the photo shown in the viewer is the one downloaded', () => {
    const livePhoto = aPhoto('IMG_7', 'heic', [aPhoto('IMG_7_video', 'mov')]);
    const photos = [aPhoto('IMG_8', 'jpg'), livePhoto, aPhoto('IMG_9', 'jpg')];
    render(<PhotosViewer photo={livePhoto} photos={photos} onClose={vi.fn()} onMoveToTrash={vi.fn()} />);

    mockViewerProps.mock.calls.at(-1)?.[0].onDownloadFile(livePhoto.file);

    const download = vi.mocked(DownloadManager.downloadItem).mock.calls.at(-1)?.[0];
    expect(download?.payload).toStrictEqual([livePhoto.file, livePhoto.relatedFiles[0].file]);
  });
});

describe('Moving past the last loaded photo in the viewer', () => {
  test('When the user reaches the last loaded photo, then older photos are requested', () => {
    const photo = aPhoto('IMG_3', 'jpg');
    const onLastPhotoReached = vi.fn();
    render(
      <PhotosViewer
        photo={photo}
        photos={[photo]}
        onClose={vi.fn()}
        onMoveToTrash={vi.fn()}
        onLastPhotoReached={onLastPhotoReached}
      />,
    );

    mockViewerProps.mock.calls.at(-1)?.[0].onLastFileReached();

    expect(onLastPhotoReached).toHaveBeenCalledOnce();
  });
});

describe('Moving a photo to the trash from the viewer', () => {
  test('When the files have no numeric id, then the photo shown in the viewer is the one moved to the trash', () => {
    const firstPhoto = aPhoto('IMG_4', 'jpg');
    const shownPhoto = aPhoto('IMG_5', 'jpg');
    const lastPhoto = aPhoto('IMG_6', 'jpg');
    const onMoveToTrash = vi.fn();
    render(
      <PhotosViewer
        photo={shownPhoto}
        photos={[firstPhoto, shownPhoto, lastPhoto]}
        onClose={vi.fn()}
        onMoveToTrash={onMoveToTrash}
      />,
    );

    mockViewerProps.mock.calls.at(-1)?.[0].keyboardShortcuts.removeItemFromKeyboard(shownPhoto.file);

    expect(onMoveToTrash).toHaveBeenCalledWith([shownPhoto]);
  });
});
