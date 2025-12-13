import { ProviderUrlsService } from '@/modules/env/provider-urls.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { SUPERFLIX_BASE_URL } from '@/providers/superflixapi/constants/url';

@Injectable()
export class SuperflixApiService implements OnModuleInit {
  private readonly logger = new Logger(SuperflixApiService.name);
  public readonly http: AxiosInstance;
  private currentUrl = SUPERFLIX_BASE_URL;

  public constructor(
    private readonly providerUrlsService: ProviderUrlsService,
  ) {
    this.http = axios.create();

    this.http.interceptors.request.use((config) => {
      config.baseURL = this.url;
      config.headers.set('Referer', this.url);
      config.headers.set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      return config;
    });
  }

  public get url(): string {
    return this.currentUrl;
  }

  public async onModuleInit(): Promise<void> {
    await this.updateUrl();
  }

  private async updateUrl(): Promise<void> {
    const configuredUrl = this.providerUrlsService.getUrl('superflixapi');
    if (configuredUrl) {
      this.currentUrl = configuredUrl;
      this.logger.log(`Using configured SuperflixAPI URL: ${this.currentUrl}`);
    } else {
      this.logger.log(`Using default SuperflixAPI URL: ${this.currentUrl}`);
    }
  }
}
