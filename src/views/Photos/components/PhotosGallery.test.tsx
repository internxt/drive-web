import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Photo } from '../types';
import PhotosGallery from './PhotosGallery';

const loadNextMonth = vi.fn();
const shownPhoto = { id: 1, takenAt: '2026-11-01T10:00:00Z', file: { id: 1 } } as unknown as Photo;

vi.mock('../hooks/useTimelinePhotos', () => ({
  useTimelinePhotos: () => ({
    photos: [shownPhoto],
    isLoading: false,
    hasMoreMonths: true,
    failedMonths: [],
    loadNextMonth,
    retryMonths: vi.fn(),
  }),
}));
vi.mock('../utils/photoTimeline', () => ({ sortPhotosNewestFirst: (photos: Photo[]) => photos }));
vi.mock('./PhotosTimeline', () => ({
  default: ({ photos, onOpenPhoto }: { photos: Photo[]; onOpenPhoto: (photo: Photo) => void }) => (
    <button onClick={() => onOpenPhoto(photos[0])}>Open photo</button>
  ),
}));

const mockViewerProps = vi.hoisted(() => vi.fn());
vi.mock('./PhotosViewer', () => ({
  default: (props: { onLastPhotoReached?: () => void }) => {
    mockViewerProps(props);
    return null;
  },
}));

describe('Opening a photo from the gallery', () => {
  test('When the viewer reaches the last loaded photo, then the gallery loads the next older month', () => {
    render(<PhotosGallery months={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open photo' }));

    mockViewerProps.mock.calls.at(-1)?.[0].onLastPhotoReached();

    expect(loadNextMonth).toHaveBeenCalledOnce();
  });
});
