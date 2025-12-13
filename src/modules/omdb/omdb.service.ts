import { EnvService } from '@/modules/env/env.service';
import { OMDB_API_URL } from '@/modules/omdb/constants/url';
import {
  OmdbCacheEntry,
  OmdbDetails,
  OmdbSearchResponse,
  OmdbType,
} from '@/modules/omdb/types/omdb';
import { Injectable, Logger
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

// Cache TTL: 24 hours in milliseconds
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OmdbService {
  private readonly logger = new Logger(OmdbService.name);
  private readonly api: AxiosInstance;
  private readonly apiKey: string | undefined;

  // In-memory cache with TTL
  private readonly searchCache = new Map<string, OmdbCacheEntry<OmdbSearchResponse>>();
  private readonly detailsCache = new Map<string, OmdbCacheEntry<OmdbDetails>>();

  public constructor(private readonly envService: EnvService) {
    this.apiKey = this.envService.get('OMDB_KEY');
    this.api = axios.create({
      baseURL: OMDB_API_URL,
    });

    if (this.apiKey) {
      this.logger.log('OMDB API configured successfully');
    } else {
      this.logger.warn('OMDB API key not configured - OMDB features disabled');
    }
  }

  /**
   * Check if OMDB is configured and available
   */
  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search movies/series by title
   */
  public async searchByTitle(
    title: string,
    type?: OmdbType,
    year?: string,
  ): Promise<OmdbSearchResponse | null> {
    if (!this.apiKey) {
      return null;
    }

    const cacheKey = `search:${title}:${type ?? 'all'}:${year ?? 'any'}`;
    const cached = this.getFromCache(this.searchCache, cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for search: ${title}`);
      return cached;
    }

    try {
      const params = new URLSearchParams();
      params.append('apikey', this.apiKey);
      params.append('s', title);

      if (type) {
        params.append('type', type);
      }
      if (year) {
        params.append('y', year);
      }

      const { status, data } = await this.api.get<OmdbSearchResponse>(
        `?${params.toString()}`,
      );

      if (status === 200 && data.Response === 'True') {
        this.setToCache(this.searchCache, cacheKey, data);
        return data;
      }

      if (data.Error) {
        this.logger.debug(`OMDB search error: ${data.Error}`);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to search OMDB: ${error.message}`);
      return null;
    }
  }

  /**
   * Get detailed information by IMDB ID
   */
  public async getByImdbId(imdbId: string): Promise<OmdbDetails | null> {
    if (!this.apiKey) {
      return null;
    }

    const cacheKey = `details:${imdbId}`;
    const cached = this.getFromCache(this.detailsCache, cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for IMDB ID: ${imdbId}`);
      return cached;
    }

    try {
      const params = new URLSearchParams();
      params.append('apikey', this.apiKey);
      params.append('i', imdbId);
      params.append('plot', 'full');

      const { status, data } = await this.api.get<OmdbDetails>(
        `?${params.toString()}`,
      );

      if (status === 200 && data.Response === 'True') {
        this.setToCache(this.detailsCache, cacheKey, data);
        return data;
      }

      if (data.Error) {
        this.logger.debug(`OMDB details error: ${data.Error}`);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get OMDB details: ${error.message}`);
      return null;
    }
  }

  /**
   * Get detailed information by title
   */
  public async getByTitle(
    title: string,
    type?: OmdbType,
    year?: string,
  ): Promise<OmdbDetails | null> {
    if (!this.apiKey) {
      return null;
    }

    const cacheKey = `title:${title}:${type ?? 'all'}:${year ?? 'any'}`;
    const cached = this.getFromCache(this.detailsCache, cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for title: ${title}`);
      return cached;
    }

    try {
      const params = new URLSearchParams();
      params.append('apikey', this.apiKey);
      params.append('t', title);
      params.append('plot', 'full');

      if (type) {
        params.append('type', type);
      }
      if (year) {
        params.append('y', year);
      }

      const { status, data } = await this.api.get<OmdbDetails>(
        `?${params.toString()}`,
      );

      if (status === 200 && data.Response === 'True') {
        this.setToCache(this.detailsCache, cacheKey, data);
        return data;
      }

      if (data.Error) {
        this.logger.debug(`OMDB title error: ${data.Error}`);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get OMDB by title: ${error.message}`);
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { searchEntries: number; detailsEntries: number } {
    return {
      searchEntries: this.searchCache.size,
      detailsEntries: this.detailsCache.size,
    };
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.searchCache) {
      if (entry.expiresAt < now) {
        this.searchCache.delete(key);
        cleared++;
      }
    }

    for (const [key, entry] of this.detailsCache) {
      if (entry.expiresAt < now) {
        this.detailsCache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} expired cache entries`);
    }
  }

  private getFromCache<T>(
    cache: Map<string, OmdbCacheEntry<T>>,
    key: string,
  ): T | null {
    const entry = cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setToCache<T>(
    cache: Map<string, OmdbCacheEntry<T>>,
    key: string,
    data: T,
  ): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }
}
