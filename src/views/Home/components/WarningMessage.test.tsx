import { describe, expect, test, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderWithTranslations } from 'testUtils/renderWithTranslations';
import enJson from 'app/i18n/locales/en.json';
import esJson from 'app/i18n/locales/es.json';
import { WarningMessage } from './WarningMessage';

describe('Storage full warning message', () => {
  test('when the user changes the language, then the storage full message is shown in the new language without reloading', async () => {
    const { i18n } = renderWithTranslations(<WarningMessage onUpgradeButtonClicked={vi.fn()} />);

    expect(screen.getByText(enJson.error.storageIsFull, { exact: false })).toBeInTheDocument();

    await act(() => i18n.changeLanguage('es'));

    expect(screen.getByText(esJson.error.storageIsFull, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: esJson.actions.upgradeNow })).toBeInTheDocument();
    expect(screen.queryByText(enJson.error.storageIsFull, { exact: false })).not.toBeInTheDocument();
  });
});
