import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNetworkInformation, logNetworkInfoForUpload } from './networkInformation';

const defineNavigatorConnection = (value: unknown) => {
  Object.defineProperty(navigator, 'connection', { value, writable: true, configurable: true });
};

describe('getNetworkInformation', () => {
  beforeEach(() => {
    defineNavigatorConnection(undefined);
  });

  it('returns null when the Network Information API is not supported', () => {
    expect(getNetworkInformation()).toBeNull();
  });

  it('returns all network info fields when navigator.connection is available', () => {
    defineNavigatorConnection({
      type: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      downlinkMax: 100,
      rtt: 50,
      saveData: false,
    });

    expect(getNetworkInformation()).toEqual({
      type: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      downlinkMax: 100,
      rtt: 50,
      saveData: false,
    });
  });

  it('returns undefined fields when the connection object has no values', () => {
    defineNavigatorConnection({});

    expect(getNetworkInformation()).toEqual({
      type: undefined,
      effectiveType: undefined,
      downlink: undefined,
      downlinkMax: undefined,
      rtt: undefined,
      saveData: undefined,
    });
  });

  it('captures saveData: true when the user has data saving enabled', () => {
    defineNavigatorConnection({
      type: 'cellular',
      effectiveType: '2g',
      downlink: 0.5,
      downlinkMax: 1,
      rtt: 800,
      saveData: true,
    });

    expect(getNetworkInformation()?.saveData).toBe(true);
  });
});

describe('logNetworkInfoForUpload', () => {
  beforeEach(() => {
    defineNavigatorConnection(undefined);
    vi.restoreAllMocks();
  });

  it('does not call console.log when the Network Information API is not supported', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    logNetworkInfoForUpload({ fileName: 'file.txt', fileSize: 1024 });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs context and all network info fields together when the API is available', () => {
    defineNavigatorConnection({
      type: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      downlinkMax: 100,
      rtt: 50,
      saveData: false,
    });
    const consoleSpy = vi.spyOn(console, 'log');

    logNetworkInfoForUpload({ fileName: 'file.txt', fileSize: 1024 });

    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith('[Upload] Network information:', {
      fileName: 'file.txt',
      fileSize: 1024,
      type: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      downlinkMax: 100,
      rtt: 50,
      saveData: false,
    });
  });

  it('logs context and network info for folder uploads', () => {
    defineNavigatorConnection({
      type: 'cellular',
      effectiveType: '3g',
      downlink: 2,
      downlinkMax: 10,
      rtt: 200,
      saveData: true,
    });
    const consoleSpy = vi.spyOn(console, 'log');

    logNetworkInfoForUpload({ folderName: 'MyFolder' });

    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith('[Upload] Network information:', {
      folderName: 'MyFolder',
      type: 'cellular',
      effectiveType: '3g',
      downlink: 2,
      downlinkMax: 10,
      rtt: 200,
      saveData: true,
    });
  });
});
