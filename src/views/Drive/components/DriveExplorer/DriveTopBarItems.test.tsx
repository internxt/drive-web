import { describe, expect, test, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderWithTranslations } from 'testUtils/renderWithTranslations';
import enJson from 'app/i18n/locales/en.json';
import esJson from 'app/i18n/locales/es.json';
import { DriveTopBarItems } from './DriveTopBarItems';

describe('Drive top bar items', () => {
  test('when the user changes the language, then the upload files button is shown in the new language without reloading', async () => {
    const { i18n } = renderWithTranslations(
      <DriveTopBarItems
        stepOneTutorialRef={{ current: null }}
        onUploadFileButtonClicked={vi.fn()}
        onUploadFolderButtonClicked={vi.fn()}
        onCreateFolderButtonClicked={vi.fn()}
      />,
    );

    expect(screen.getByText(enJson.actions.upload.uploadFiles)).toBeInTheDocument();

    await act(() => i18n.changeLanguage('es'));

    expect(screen.getByText(esJson.actions.upload.uploadFiles)).toBeInTheDocument();
    expect(screen.queryByText(enJson.actions.upload.uploadFiles)).not.toBeInTheDocument();
  });
});
