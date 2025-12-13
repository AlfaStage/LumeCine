import { ProviderUrlsService } from '@/modules/env/provider-urls.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class RedeCanaisUrlService implements OnModuleInit {
  private readonly logger = new Logger(RedeCanaisUrlService.name);
  private currentUrl = 'https://redecanais.do'; // Default fallback

  public constructor(
    private readonly providerUrlsService: ProviderUrlsService,
  ) {}

  public get url(): string {
    return this.currentUrl;
  }

  public async onModuleInit() {
    await this.checkAndUpdateUrl();
  }

  public async checkAndUpdateUrl(): Promise<void> {
    const isWorking = await this.isUrlWorking(this.currentUrl);
    if (isWorking) {
      this.logger.log(`Current URL ${this.currentUrl} is working.`);
      return;
    }

    this.logger.warn(`Current URL ${this.currentUrl} is not working. Searching for a new one...`);
    const newUrl = await this.findNewUrl();

    if (newUrl) {
      this.currentUrl = newUrl;
      this.logger.log(`Updated RedeCanais URL to: ${this.currentUrl}`);
    } else {
      this.logger.error('Failed to find a working RedeCanais URL.');
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

  private async findNewUrl(): Promise<string | null> {
    // 1. Try Pastebin (Manual override/High priority)
    const pastebinUrl = await this.fetchFromPastebin();
    if (pastebinUrl) return pastebinUrl;

    // 2. Try a list of common/known domains (Fastest & Most Reliable)
    const candidates = [
      'https://redecanais.do',
      'https://redecanais.la',
      'https://redecanais.gy',
      'https://redecanais.net',
      'https://redecanais.com',
      'https://redecanais.fi',
      'https://redecanais.wf',
      'https://redecanais.cx',
      'https://redecanais.biz',
      'https://redecanais.cloud',
    ];

    for (const candidate of candidates) {
      if (candidate !== this.currentUrl && await this.isUrlWorking(candidate)) {
        this.logger.log(`Found working URL from candidate list: ${candidate}`);
        return candidate;
      }
    }

    // 3. Try Google Search (User preferred)
    const googleUrl = await this.searchGoogle();
    if (googleUrl) return googleUrl;

    // 4. Fallback to DuckDuckGo
    const ddgUrl = await this.searchDuckDuckGo();
    if (ddgUrl) return ddgUrl;

    return null;
  }

  private async fetchFromPastebin(): Promise<string | null> {
    try {
      this.logger.log('Checking centralized provider URLs for RedeCanais...');
      
      // Get URL from centralized ProviderUrlsService
      const candidate = this.providerUrlsService.getUrl('redecanais');
      
      if (candidate) {
        if (await this.isUrlWorking(candidate)) {
          this.logger.log(`Found working URL via ProviderUrlsService: ${candidate}`);
          return candidate;
        }
      }
    } catch (error) {
      this.logger.error(`Error checking ProviderUrlsService: ${error.message}`);
    }
    return null;
  }

  private async searchGoogle(): Promise<string | null> {
    try {
      this.logger.log('Searching new URL on Google...');
      const { data } = await axios.get('https://www.google.com/search?q=redecanais', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cookie': 'CONSENT=YES+cb.20210720-07-p0.en+FX+417; SOCS=CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiAo_CmBg', // Try to bypass consent
        },
      });

      const $ = cheerio.load(data);
      const links = $('a').map((_, el) => $(el).attr('href')).get();

      for (const link of links) {
        let cleanLink = link;
        // Google sometimes returns /url?q=...
        if (link.startsWith('/url?q=')) {
          cleanLink = link.split('/url?q=')[1].split('&')[0];
        }

        const match = cleanLink.match(/https?:\/\/(www\.)?redecanais\.[a-z]+/i);
        if (match) {
          const candidate = match[0];
          // Avoid checking the same broken URL again if possible, but isUrlWorking handles it.
          if (await this.isUrlWorking(candidate)) {
            this.logger.log(`Found working URL via Google: ${candidate}`);
            return candidate;
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error searching Google: ${error.message}`);
    }
    return null;
  }

  private async searchDuckDuckGo(): Promise<string | null> {
    try {
      this.logger.log('Searching new URL on DuckDuckGo...');
      const searchUrl = 'https://html.duckduckgo.com/html/?q=redecanais';
      const { data } = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const $ = cheerio.load(data);
      const links = $('.result__a').map((_, el) => $(el).attr('href')).get();

      for (const link of links) {
        const match = link.match(/https?:\/\/(www\.)?redecanais\.[a-z]+/i);
        if (match) {
          const candidate = match[0];
          if (await this.isUrlWorking(candidate)) {
            this.logger.log(`Found working URL via DuckDuckGo: ${candidate}`);
            return candidate;
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error searching DuckDuckGo: ${error.message}`);
    }

    return null;
  }
}
