import { EnvService } from '@/modules/env/env.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';

const DEFAULT_PROVIDERS_URL = 'https://pastebin.com/raw/mAt4pVJz';

@Injectable()
export class ProviderUrlsService implements OnModuleInit {
  private readonly logger = new Logger(ProviderUrlsService.name);
  private urls: Map<string, string> = new Map();

  public constructor(private readonly envService: EnvService) {}

  public async onModuleInit(): Promise<void> {
    await this.fetchProviderUrls();
  }

  public getUrl(provider: string): string | null {
    return this.urls.get(provider.toLowerCase()) ?? null;
  }

  public async fetchProviderUrls(): Promise<void> {
    try {
      const configUrl =
        this.envService.get('PROVIDERS_URL') ?? DEFAULT_PROVIDERS_URL;

      this.logger.log(`Fetching provider URLs from: ${configUrl}`);

      const { data } = await axios.get(configUrl, { timeout: 10000 });
      const lines = String(data).split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^(\w+)=(https?:\/\/[^\s]+)$/i);
        if (match) {
          const [, provider, url] = match;
          const cleanUrl = url.replace(/\/$/, ''); // Remove trailing slash
          this.urls.set(provider.toLowerCase(), cleanUrl);
          this.logger.log(`Loaded URL for ${provider}: ${cleanUrl}`);
        }
      }

      this.logger.log(`Successfully loaded ${this.urls.size} provider URLs`);
    } catch (error) {
      this.logger.error(`Failed to fetch provider URLs: ${error.message}`);
    }
  }

  public async refreshUrls(): Promise<void> {
    this.urls.clear();
    await this.fetchProviderUrls();
  }
}
