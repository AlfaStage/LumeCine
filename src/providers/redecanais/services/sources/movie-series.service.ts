import { toASCII } from 'node:punycode';
import { PLAYER_URL } from '@/providers/redecanais/constants/url';
import { RedeCanaisUrlService } from '@/providers/redecanais/services/url.service';
import { decrypt } from '@/providers/redecanais/utils/decrypt';
import { Injectable, Logger } from '@nestjs/common';

export type FetchOptions = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  redirect?: 'follow' | 'manual';
};

export type SourceResponse = {
  url: string;
  token: string;
};

@Injectable()
export class RedeCanaisMovieSeriesSourcesService {
  private readonly logger = new Logger(
    RedeCanaisMovieSeriesSourcesService.name,
  );

  public constructor(private readonly urlService: RedeCanaisUrlService) {}

  public async build(url: string): Promise<string> {
    try {
      const playerUrl = await this.fetchPlayerUrl(url);
      const sourceData = await this.fetchSourceData(playerUrl);
      const streamUrl = await this.fetchStreamUrl(sourceData);
      const videoUrl = await this.resolveVideoUrl(streamUrl);

      return videoUrl;
    } catch (error) {
      this.logger.error(
        `Failed to get stream URL: ${error.message} (${error.stack})`,
      );
    }
  }

  private async fetchPlayerUrl(url: string): Promise<string> {
    const { uri, referer } = this.getRequestContext(url);
    const html = await this.fetchWithRetry(uri, {
      method: 'GET',
      headers: this.getDefaultHeaders(referer),
    });

    const decrypted = decrypt(html);
    const iframeMatch = decrypted.match(/<iframe\s+[^>]*src=["']([^"']*)["']/i);

    if (!iframeMatch) {
      throw new Error('Player iframe URL not found in response');
    }

    const endpoint = new URL(`${referer}${toASCII(iframeMatch[1])}`).href;

    return endpoint;
  }

  private async fetchSourceData(url: string): Promise<SourceResponse> {
    const { uri, referer } = this.getRequestContext(url);
    const html = await this.fetchWithRetry(uri, {
      method: 'GET',
      headers: this.getDefaultHeaders(referer),
    });

    const decrypted = decrypt(html);
    const ajaxMatch = decrypted.match(/\$.ajax\(([\s\S]*?)\);/i);

    if (!ajaxMatch) {
      throw new Error('AJAX request pattern not found in source');
    }

    const urlMatch = ajaxMatch[1].match(/url:\s*['"]([^'"]+)['"]/);
    const tokenMatch = ajaxMatch[1].match(/'rctoken':'([^']+)'/);

    if (!urlMatch || !tokenMatch) {
      throw new Error('Missing required source URL or token');
    }

    const parsedUrl = new URL(urlMatch[1], uri);
    const source = {
      url: `${PLAYER_URL}${parsedUrl.pathname}${parsedUrl.search}`,
      token: tokenMatch[1],
    };

    return source;
  }

  private async fetchStreamUrl(source: SourceResponse): Promise<string> {
    const { uri, referer } = this.getRequestContext(source.url);
    const html = await this.fetchWithRetry(uri, {
      method: 'POST',
      headers: {
        ...this.getDefaultHeaders(referer),
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: `rctoken=${encodeURIComponent(source.token)}`,
    });

    const vodMatch = html?.match(/const\s+VID_URL\s*=\s*["']([^"']+)["']/);

    if (!vodMatch) {
      throw new Error('VOD URL not found in stream response');
    }

    const endpoint = new URL(vodMatch[1], uri).href;

    return endpoint;
  }

  private async resolveVideoUrl(url: string): Promise<string | null> {
    const { uri, referer } = this.getRequestContext(url);

    try {
      const response = await fetch(uri, {
        method: 'GET',
        redirect: 'follow',
        headers: { referer },
      });

      // Handle both successful responses and redirects.
      const videoUrl = response.redirected
        ? response.url
        : response.headers.get('location');

      return videoUrl;
    } catch (error) {
      this.logger.warn(
        `Video URL resolution encountered an error: ${error.message}`,
      );

      return null;
    }
  }

  private async fetchWithRetry(
    url: string,
    options: FetchOptions,
    retries = 3,
  ): Promise<string> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error, status: ${response.status}`);
      }

      const content = await response.text();

      return content;
    } catch (error) {
      if (retries > 0) {
        this.logger.warn(`Retrying fetch (${retries} attempts left)`);
        return this.fetchWithRetry(url, options, retries - 1);
      }
    }
  }

  private getRequestContext(url: string): {
    uri: string;
    referer: string;
  } {
    const uri = new URL(url, this.urlService.url).href;
    const referer = new URL(uri).origin;

    return { uri, referer };
  }

  private getDefaultHeaders(referer: string): Record<string, string> {
    return {
      referer,
      'referer-policy': 'strict-origin-when-cross-origin',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
  }
}
