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
  default: (props: { onDownloadFile: (file: DriveItemData) => void; onLastFileReached?: () => void }) => {
    mockViewerProps(props);
    return null;
  },
}));

const aPhoto = (name: string, type: string, relatedFiles: Photo[] = []): Photo =>
  ({
    id: name.length,
    name,
    type,
    relatedFiles,
    file: { id: name.length, name, type, isFolder: false } as DriveItemData,
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
