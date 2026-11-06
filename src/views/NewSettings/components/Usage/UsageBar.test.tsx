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
    <div data-testid={`segment-${title}`} className={className}>
      <span>{`${title}: ${subtitle}`}</span>
      {children}
    </div>
  ),
}));

const GB = 1024 ** 3;

const renderBar = (props = {}) =>
  render(<UsageBar driveUsage={0} backupsUsage={0} spaceLimit={GB} height="h-8" {...props} />);

const getSegmentElement = (title: string) => screen.getByTestId(`segment-${title}`).parentElement as HTMLElement;

const getSegmentPercentage = (title: string) => Number.parseFloat(getSegmentElement(title).style.width);

describe('UsageBar', () => {
  test('when usage is over the limit, then both segments are red', () => {
    renderBar({ driveUsage: 30 * GB, backupsUsage: 10 * GB });

    expect(screen.getByTestId('segment-Drive').className).toContain('bg-red');
    expect(screen.getByTestId('segment-Backup').className).toContain('bg-red');
  });

  test('when usage is over the limit, then the segments together fill exactly 100%', () => {
    renderBar({ driveUsage: 30 * GB, backupsUsage: 10 * GB });

    expect(getSegmentPercentage('Drive') + getSegmentPercentage('Backup')).toBeCloseTo(100);
  });

  test('when usage is under the limit, then the segments keep their regular colors and percentages', () => {
    renderBar({ driveUsage: GB / 4, backupsUsage: GB / 4 });

    expect(screen.getByTestId('segment-Drive').className).toContain('bg-primary');
    expect(screen.getByTestId('segment-Backup').className).toContain('bg-indigo');
    expect(getSegmentPercentage('Drive')).toBe(25);
  });

  test('when drive usage is non-zero, then the drive segment has a 5px minimum width', () => {
    renderBar({ driveUsage: 1 });

    expect(getSegmentElement('Drive').className).toContain('min-w-[5px]');
  });

  test('when drive usage is zero, then the drive segment has no minimum width', () => {
    renderBar();

    expect(getSegmentElement('Drive').className).not.toContain('min-w-[5px]');
  });

  test('when drive and backups usage differ, then the backup tooltip shows the backups usage', () => {
    renderBar({ driveUsage: 2 * GB, backupsUsage: 3 * GB, spaceLimit: 10 * GB });

    expect(screen.getByText('Drive: 2GB')).toBeInTheDocument();
    expect(screen.getByText('Backup: 3GB')).toBeInTheDocument();
  });

  test('when only drive has usage, then the drive segment has no divider margin and is rounded on both sides', () => {
    renderBar({ driveUsage: 2 * GB });

    const { className } = screen.getByTestId('segment-Drive');
    expect(className).not.toContain('mr-0.5');
    expect(className).toContain('rounded-lg');
  });

  test('when only backups have usage, then the backup segment is rounded on both sides', () => {
    renderBar({ backupsUsage: GB / 2 });

    expect(screen.getByTestId('segment-Backup').className).toContain('rounded-lg');
  });

  test('when drive and backups have usage, then the divider margin is kept on the drive segment', () => {
    renderBar({ driveUsage: GB / 4, backupsUsage: GB / 4 });

    expect(screen.getByTestId('segment-Drive').className).toContain('mr-0.5');
    expect(screen.getByTestId('segment-Drive').className).toContain('rounded-l-lg');
    expect(screen.getByTestId('segment-Backup').className).toContain('rounded-r-lg');
  });
});
