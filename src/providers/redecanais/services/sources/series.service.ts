import { NlpProcessingService } from '@/modules/nlp/services/processing.service';
import {
  AUDIO_DUBBED_REGEX,
  AUDIO_MUTED_REGEX,
  AUDIO_NATIONAL_REGEX,
  AUDIO_SUBTITLED_REGEX,
  AUDIO_URL_REGEX_2,
  EPISODE_TITLE_REGEX,
} from '@/providers/redecanais/constants/regex';
import { SEASON_CONTAINER_SELECTORS } from '@/providers/redecanais/constants/string';
import { RedeCanaisUrlService } from '@/providers/redecanais/services/url.service';
import { decrypt } from '@/providers/redecanais/utils/decrypt';
import { match, matches } from '@/utils/regex';
import { Injectable, Logger } from '@nestjs/common';
import { Audio } from '@prisma/client';
import * as cheerio from 'cheerio';
import * as sanitize from 'sanitize-html';

export type FetchOptions = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  redirect?: 'follow' | 'manual';
};

export type Season = {
  title: string;
  episodes: {
    title: string;
    tracks: Track[];
  }[];
};

export type Episode = {
  seasonTitle: string;
  episodeTitle: string;
  episodeTracks: Track[];
};

export type Track = {
  url: string;
  audio: Audio;
};

@Injectable()
export class RedeCanaisSeriesSourcesService {
  private readonly logger = new Logger(RedeCanaisSeriesSourcesService.name);

  public constructor(
    private readonly nlpProcessingService: NlpProcessingService,
    private readonly urlService: RedeCanaisUrlService,
  ) {}

  public async build(url: string) {
    const { uri, referer } = this.getRequestContext(url);
    const html = await this.fetchWithRetry(uri, {
      method: 'GET',
      headers: this.getDefaultHeaders(referer),
    });

    const decrypted = decrypt(html);
    const episodes = this.parseEpisodes(decrypted);
    const seasons = this.parseSeasons(episodes);
    const output = seasons.map((season) => season.episodes);

    return output;
  }

  private parseEpisodes(content: string) {
    const $ = this.startCheerio(content);
    const episodes: Episode[] = [];

    $('span').each((_, seasonElement) => {
      const seasonTitle = $(seasonElement).text().trim();

      $(seasonElement)
        .nextUntil('span')
        .each((_, element) => {
          if ($(element).is('p')) {
            const episodeTitle = this.beautify($(element).text().trim());
            const episodeTracks = this.extractEpisodes($, element as never);

            if (episodeTitle) {
              episodes.push({
                seasonTitle,
                episodeTitle,
                episodeTracks,
              });
            }
          }
        });
    });

    return episodes;
  }

  private parseSeasons(episodes: Episode[]) {
    const seasons: Season[] = [];

    for (const episode of episodes) {
      const seasonTitle = this.nlpProcessingService.normalize(
        episode.seasonTitle,
      );
      const seasonIndex = seasons.findIndex(
        (s) => this.nlpProcessingService.normalize(s.title) === seasonTitle,
      );

      const episodeData = {
        title: episode.episodeTitle,
        tracks: episode.episodeTracks,
      };

      if (seasonIndex === -1) {
        seasons.push({
          title: episode.seasonTitle,
          episodes: [episodeData],
        });
      } else {
        seasons[seasonIndex].episodes.push(episodeData);
      }
    }

    return seasons;
  }

  private startCheerio(content: string) {
    const container = this.findContainer(content);
    const sanitized = this.sanitizeContainer(container);

    return cheerio.load(sanitized);
  }

  private findContainer(content: string): string {
    const $ = cheerio.load(content);

    for (const selector of SEASON_CONTAINER_SELECTORS) {
      const html = $(selector).html()?.trim();
      if (html) return html;
    }

    return '';
  }

  private sanitizeContainer(html: string): string {
    // First pass: basic sanitization.
    const firstPass = sanitize(html, {
      allowedAttributes: { a: ['href'] },
      allowedTags: ['a', 'span'],
    });

    // Second pass: ensure text is wrapped in paragraphs.
    const secondPass = sanitize(firstPass, {
      allowedTags: ['a', 'p', 'span'],
      textFilter: (text, tagName) => {
        const hasContent =
          /(.|\s)*\S(.|\s)*/.test(text) && !/^\s*\/\s*$/.test(text);

        return hasContent ? (!tagName ? `<p>${text}</p>` : text) : '';
      },
    });

    // Third pass: ensure we have at least one span for season splitting.
    if (!secondPass.includes('<span')) {
      return `<span>season-${Date.now()}</span>${secondPass}`;
    }

    return secondPass;
  }

  private extractEpisodes($: cheerio.CheerioAPI, episode: never) {
    return $(episode)
      .nextUntil('p')
      .map((_, track) => {
        const audios: Record<string, Audio> = {
          dublado: Audio.DUBBED,
          dubaldo: Audio.DUBBED,
          duiblado: Audio.DUBBED,
          legendado: Audio.SUBTITLED,
          legendaod: Audio.SUBTITLED,
        };

        const text = this.nlpProcessingService.normalize($(track).text());
        const url = $(track).attr('href');

        const audioMatches = match(
          String(url).toLowerCase(),
          AUDIO_URL_REGEX_2,
        );

        const availableAudio = {
          DUBBED: AUDIO_DUBBED_REGEX,
          SUBTITLED: AUDIO_SUBTITLED_REGEX,
          NATIONAL: AUDIO_NATIONAL_REGEX,
          MUTED: AUDIO_MUTED_REGEX,
        };

        const audioRegex = matches(audioMatches, availableAudio) as Audio;
        const audio = audioRegex ?? audios[text] ?? Audio.UNKNOWN;

        return url ? { url, audio } : null;
      })
      .toArray()
      .filter(Boolean);
  }

  private beautify(title: string): string {
    const clean = title.trim();
    const fallback = title.replace(/(\s*-)$/g, '').trim();
    const match = clean.match(EPISODE_TITLE_REGEX)?.[1] ?? fallback;

    return match;
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
