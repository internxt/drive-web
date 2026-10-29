import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { PreviewFileItem } from 'app/share/types';
import FileXlsxViewer from './FileXlsxViewer';

const { xlsx2Html } = vi.hoisted(() => ({ xlsx2Html: vi.fn() }));

vi.mock('xlsx-preview', () => ({ __esModule: true, default: { xlsx2Html } }));

const file = { id: 1, name: 'budget', type: 'xlsx' } as PreviewFileItem;

describe('Spreadsheet preview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('When the spreadsheet is shown and then closed, then the memory used by its preview is released', async () => {
    xlsx2Html.mockResolvedValue(new TextEncoder().encode('<table></table>').buffer);
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');
    const { container, unmount } = render(<FileXlsxViewer file={file} blob={new Blob(['xlsx'])} onError={vi.fn()} />);
    await waitFor(() => expect(container.querySelector('object')?.getAttribute('data')).toMatch(/^blob:/));
    const previewUrl = container.querySelector('object')?.getAttribute('data');

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith(previewUrl);
  });

  test('When the spreadsheet cannot be converted, then the preview is marked as unavailable', async () => {
    xlsx2Html.mockRejectedValue(new Error('corrupted'));
    const onError = vi.fn();

    render(<FileXlsxViewer file={file} blob={new Blob(['xlsx'])} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
