import { BrowserHistoryBuildOptions, createBrowserHistory } from 'history';
import queryString from 'query-string';

import { SelectSectionProps } from 'app/newSettings/types/types';
import { AppView } from '../types';
import configService from './config.service';
import errorService from './error.service';
import { AppDispatch } from 'app/store';

const browserHistoryConfig: BrowserHistoryBuildOptions = {
  forceRefresh: false,
};

if (process.env.REACT_APP_BASE_URL) {
  browserHistoryConfig.basename = process.env.REACT_APP_BASE_URL;
}

const instance = createBrowserHistory(browserHistoryConfig);

const navigationService = {
  history: instance,
  push(viewId: AppView, queryMap: Record<string, unknown> = {}, workspaceUuid?: string): void {
    const viewConfig = configService.getViewConfig({ id: viewId });
    let viewSearch = queryString.stringify(queryMap);

    if (workspaceUuid) viewSearch += `${viewSearch ? '&' : ''}workspaceid=${workspaceUuid}`;

    if (!viewConfig) {
      console.warn(`(NavigationService) View with ID ${viewId} not found`);
    }

    instance.push({ pathname: viewConfig?.path ?? 'view-not-found', search: viewSearch });
  },
  pushFolder(folderUuid: string | undefined, workspaceUuid?: string): void {
    workspaceUuid
      ? instance.push(`/folder/${folderUuid}?workspaceid=${workspaceUuid}`)
      : instance.push(`/folder/${folderUuid}`);
  },
  pushFile(uuid: string | undefined, workspaceUuid?: string): void {
    workspaceUuid ? instance.push(`/file/${uuid}?workspaceid=${workspaceUuid}`) : instance.push(`/file/${uuid}`);
  },
  isCurrentPath(path: string): boolean {
    const pathname = navigationService.history.location.pathname.split('/');
    const currentPath = pathname[1];
    return currentPath === path;
  },
  getUuid(): string | undefined {
    const pathname = navigationService.history.location.pathname.split('/');
    const lastSegment = pathname[pathname.length - 1];
    return lastSegment;
  },
  openPreferencesDialog({ section, subsection, workspaceUuid }: SelectSectionProps) {
    workspaceUuid
      ? instance.push(`?workspaceid=${workspaceUuid}&preferences=open&section=${section}&subsection=${subsection}`)
      : instance.push(`?preferences=open&section=${section}&subsection=${subsection}`);
  },
  closePreferencesDialog({ workspaceUuid }: { workspaceUuid: string | undefined }) {
    workspaceUuid
      ? instance.push(`${navigationService.history.location.pathname}?workspaceid=${workspaceUuid}`)
      : instance.push(navigationService.history.location.pathname);
  },
  replaceState(uuid: string | undefined): void {
    try {
      const pathname = navigationService.history.location.pathname.split('/');
      pathname[pathname.length - 1] = uuid ?? '';
      const newPathname = pathname.join('/');
      window.history.replaceState(null, '', newPathname);
    } catch (error) {
      errorService.reportError(error);
    }
  },
  setWorkspaceFromParams(workspaceThunks, dispatch: AppDispatch, updateUrl = true): void {
    const params = new URLSearchParams(window.location.search);
    const [currentWorkspaceUuid] = params.getAll('workspaceid');
    !window.location.pathname.includes('file') &&
      !window.location.pathname.includes('folder') &&
      dispatch(workspaceThunks.setSelectedWorkspace({ workspaceId: currentWorkspaceUuid || null, updateUrl }));
  },
};

export default navigationService;
