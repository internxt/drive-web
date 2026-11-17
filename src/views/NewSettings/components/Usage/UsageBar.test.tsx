import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import UsageBar from './UsageBar';

vi.mock('@internxt/ui', () => ({
  Tooltip: ({
    title,
    subtitle,
    className,
    children,
  }: {
    title: string;
    subtitle: string;
    className: string;
    children: React.ReactNode;
  }) => (
    <div data-testid={`tooltip-${title}`} className={className}>
      <span>{`${title}: ${subtitle}`}</span>
      {children}
    </div>
  ),
}));

const GB = 1024 ** 3;

const renderBar = (props = {}) =>
  render(<UsageBar driveUsage={0} backupsUsage={0} spaceLimit={GB} height="h-8" {...props} />);

const getTooltipClassName = (title: string) => screen.getByTestId(`tooltip-${title}`).className;

const getSegment = (title: string) => screen.getByTestId(`tooltip-${title}`).parentElement as HTMLElement;

const getSegmentWidth = (title: string) => Number.parseFloat(getSegment(title).style.width);

describe('UsageBar', () => {
  test('when usage is over the limit, then both segments are red and scaled to fill the bar', () => {
    renderBar({ driveUsage: 30 * GB, backupsUsage: 10 * GB });

    expect(getTooltipClassName('Drive')).toContain('bg-red');
    expect(getTooltipClassName('Backup')).toContain('bg-red');
    expect(getSegmentWidth('Drive')).toBe(75);
    expect(getSegmentWidth('Backup')).toBe(25);
  });

  test('when usage is under the limit, then the segments keep their regular colors and percentages', () => {
    renderBar({ driveUsage: GB / 4, backupsUsage: GB / 4 });

    expect(getTooltipClassName('Drive')).toContain('bg-primary');
    expect(getTooltipClassName('Backup')).toContain('bg-indigo');
    expect(getSegmentWidth('Drive')).toBe(25);
    expect(getSegmentWidth('Backup')).toBe(25);
  });

  test('when drive and backups usage differ, then the backup tooltip shows the backups usage', () => {
    renderBar({ driveUsage: 2 * GB, backupsUsage: 3 * GB, spaceLimit: 10 * GB });

    expect(screen.getByText('Drive: 2GB')).toBeInTheDocument();
    expect(screen.getByText('Backup: 3GB')).toBeInTheDocument();
  });
});
