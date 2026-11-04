import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import PhotosView from './PhotosView';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));
vi.mock('react-helmet-async', () => ({
  Helmet: () => null,
}));

describe('Photos view', () => {
  test('When the user opens Photos, then the Photos title is shown', () => {
    render(<PhotosView />);

    expect(screen.getByRole('heading', { name: 'views.photos.head' })).toBeInTheDocument();
  });
});
