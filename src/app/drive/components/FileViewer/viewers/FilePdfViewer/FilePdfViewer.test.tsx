import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PreviewFileItem } from 'app/share/types';
import FilePdfViewer from './FilePdfViewer';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const ONE_PAGE_PDF = [
  '%PDF-1.1',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj',
  'trailer<</Root 1 0 R>>',
  '%%EOF',
].join('\n');

const file = { id: 1, name: 'document', type: 'pdf' } as PreviewFileItem;

let activeObservers = 0;

class CountingIntersectionObserver {
  observe = () => {
    activeObservers++;
  };
  disconnect = () => {
    activeObservers--;
  };
  unobserve = vi.fn();
  takeRecords = () => [];
}

const findDocumentUrl = (createObjectURL: ReturnType<typeof vi.spyOn>) => {
  const documentCallIndex = createObjectURL.mock.calls.findIndex(
    ([source]) => (source as Blob).type === 'application/pdf',
  );
  return createObjectURL.mock.results[documentCallIndex].value as string;
};

describe('PDF preview', () => {
  beforeEach(() => {
    activeObservers = 0;
    vi.stubGlobal('IntersectionObserver', CountingIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('When the document cannot be read, then the preview is marked as unavailable', async () => {
    const onError = vi.fn();

    render(<FilePdfViewer file={file} blob={new Blob(['not a pdf'])} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  test('When the preview is closed, then the memory used by the document is released', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');
    const { unmount } = render(<FilePdfViewer file={file} blob={new Blob([ONE_PAGE_PDF])} onError={vi.fn()} />);
    const documentUrl = findDocumentUrl(createObjectURL);

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith(documentUrl);
  });

  test('When the user zooms several times, then each page keeps a single visibility watcher until it is closed', async () => {
    const { unmount } = render(<FilePdfViewer file={file} blob={new Blob([ONE_PAGE_PDF])} onError={vi.fn()} />);
    await waitFor(() => expect(activeObservers).toBe(1));
    const [, zoomInButton] = screen.getAllByRole('button');

    fireEvent.click(zoomInButton);
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomInButton);
    await waitFor(() => expect(screen.getByText('300%')).toBeInTheDocument());

    expect(activeObservers).toBe(1);
    unmount();
    expect(activeObservers).toBe(0);
  });
});
