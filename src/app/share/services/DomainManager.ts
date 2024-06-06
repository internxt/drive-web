import envService from '../../core/services/env.service';
import errorService from '../../core/services/error.service';
import shareService from './share.service';

const isDevelopment = !envService.isProduction();

class DomainManager {
  private static instance: DomainManager;
  private domains: string[] = [];

  static getInstance(): DomainManager {
    if (!DomainManager.instance) {
      DomainManager.instance = new DomainManager();
    }
    return DomainManager.instance;
  }

  async fetchDomains(): Promise<void> {
    try {
      const response = isDevelopment
        ? { list: [process.env.REACT_APP_SHARE_LINKS_DOMAIN] }
        : await shareService.getShareDomains();

      const domainsList = response.list;
      this.domains = domainsList;
    } catch (error) {
      errorService.reportError(error);
      this.domains = [process.env.REACT_APP_SHARE_LINKS_DOMAIN];
    }
  }

  async fetchAndGetDomainsList(): Promise<string[]> {
    if (this.domains.length === 0) {
      await this.fetchDomains();
    }
    return this.domains;
  }

  getDomainsList(): string[] {
    return this.domains;
  }
}

export const domainManager = DomainManager.getInstance();
