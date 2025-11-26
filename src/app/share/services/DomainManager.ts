import envService from 'services/env.service';
import errorService from 'services/error.service';
import shareService from './share.service';

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
      const isDevelopment = !envService.isProduction();
      const response = isDevelopment
        ? { list: [envService.getVariable('shareLinksDomain')] }
        : await shareService.getShareDomains();

      const domainsList = response.list;
      this.domains = domainsList;
    } catch (error) {
      errorService.reportError(error);
      this.domains = [envService.getVariable('shareLinksDomain')];
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
