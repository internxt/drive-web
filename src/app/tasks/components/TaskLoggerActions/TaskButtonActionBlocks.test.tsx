import { describe, expect, test, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderWithTranslations } from 'testUtils/renderWithTranslations';
import enJson from 'app/i18n/locales/en.json';
import esJson from 'app/i18n/locales/es.json';
import { PausedBlock, PendingBlock } from './TaskButtonActionBlocks';

describe('Task logger status labels', () => {
  test.each([
    {
      status: 'paused',
      block: <PausedBlock isHovered={false} cancelAction={vi.fn()} resumeAction={vi.fn()} />,
      en: enJson.tasks.paused,
      es: esJson.tasks.paused,
    },
    { status: 'waiting', block: <PendingBlock />, en: enJson.tasks.waiting, es: esJson.tasks.waiting },
  ])(
    'when the user changes the language, then the $status label is shown in the new language without reloading',
    async ({ block, en, es }) => {
      const { i18n } = renderWithTranslations(block);

      expect(screen.getByText(en)).toBeInTheDocument();

      await act(() => i18n.changeLanguage('es'));

      expect(screen.getByText(es)).toBeInTheDocument();
    },
  );
});
