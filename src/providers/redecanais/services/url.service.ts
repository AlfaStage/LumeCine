import { ProviderUrlsService } from '@/modules/env/provider-urls.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RedeCanaisUrlService implements OnModuleInit {
  private readonly logger = new Logger(RedeCanaisUrlService.name);
  private currentUrl: string | null = null;

  public constructor(
    private readonly providerUrlsService: ProviderUrlsService,
  ) {}

  public get url(): string {
    if (!this.currentUrl) {
      throw new Error('RedeCanais URL not configured. Check PROVIDERS_URL.');
    }
    return this.currentUrl;
  }

  public async onModuleInit() {
    const configuredUrl = this.providerUrlsService.getUrl('redecanais');

    if (!configuredUrl) {
      this.logger.error(
        'RedeCanais URL not found in PROVIDERS_URL configuration!',
      );
      return;
    }

    this.currentUrl = configuredUrl;
    this.logger.log(
      `Using RedeCanais URL from configuration: ${this.currentUrl}`,
    );

    // Verify the URL is working
    const isWorking = await this.isUrlWorking(this.currentUrl);
    if (isWorking) {
      this.logger.log(`RedeCanais URL ${this.currentUrl} is working.`);
    } else {
      this.logger.warn(
        `RedeCanais URL ${this.currentUrl} is not responding. Will retry on requests.`,
      );
    }
  }

  private async isUrlWorking(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status >= 200 && response.status < 400;
    } catch {
      return false;
    }
  }
}
