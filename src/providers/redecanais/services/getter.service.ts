import {
  DelegateMovieProviders,
  DelegateSeriesProviders,
} from '@/modules/providers/providers.service';
import {
  AUDIO_DUBBED_REGEX,
  AUDIO_MUTED_REGEX,
  AUDIO_NATIONAL_REGEX,
  AUDIO_REGEX,
  AUDIO_SUBTITLED_REGEX,
  AUDIO_URL_REGEX_1,
  QUALITY_FHD_REGEX,
  QUALITY_HD_REGEX,
  QUALITY_REGEX,
  QUALITY_SD_REGEX,
  QUALITY_UHD_REGEX,
  QUALITY_URL_REGEX,
  RAW_REGEX,
  TITLE_REGEX_1,
  TITLE_REGEX_2,
  URL_REGEX,
} from '@/providers/redecanais/constants/regex';
import { MOVIES_URL, SERIES_URL } from '@/providers/redecanais/constants/url';
import { RedeCanaisApiService } from '@/providers/redecanais/services/api.service';
import { match, matches } from '@/utils/regex';
import { Injectable } from '@nestjs/common';
import { Audio, Quality } from '@prisma/client';

@Injectable()
export class RedeCanaisGetterService {
  public constructor(private readonly apiService: RedeCanaisApiService) {}

  public async fetchMovies(): Promise<DelegateMovieProviders[]> {
    const { data }: { data: string } =
      await this.apiService.http.get(MOVIES_URL);
    const indexes: string[] = data.match(RAW_REGEX) ?? [];

    const sanitized = indexes.map(this.sanitizeMovie);
    const formatted = sanitized.map(this.formatMovie);

    return formatted;
  }

  public async fetchSeries(): Promise<DelegateSeriesProviders[]> {
    const { data }: { data: string } =
      await this.apiService.http.get(SERIES_URL);
    const indexes: string[] = data.match(RAW_REGEX) ?? [];

    const sanitized = indexes.map(this.sanitizeSeries);
    const formatted = sanitized.map(this.formatSeries);

    return formatted;
  }

  private sanitizeMovie(content: string) {
    const url = match(content, URL_REGEX);
    const title =
      match(content, TITLE_REGEX_1) ?? match(content, TITLE_REGEX_2);
    const audio =
      match(content, AUDIO_REGEX) ??
      match(content, AUDIO_URL_REGEX_1) ??
      Audio.UNKNOWN;
    const quality =
      match(content, QUALITY_REGEX) ??
      match(content, QUALITY_URL_REGEX) ??
      Quality.UNKNOWN;

    return { url, title, audio, quality };
  }

  private sanitizeSeries(content: string) {
    const url = match(content, URL_REGEX);
    const title =
      match(content, TITLE_REGEX_1) ?? match(content, TITLE_REGEX_2);

    return { url, title };
  }

  private formatMovie(content: DelegateMovieProviders): DelegateMovieProviders {
    const audios = {
      DUBBED: AUDIO_DUBBED_REGEX,
      SUBTITLED: AUDIO_SUBTITLED_REGEX,
      NATIONAL: AUDIO_NATIONAL_REGEX,
      MUTED: AUDIO_MUTED_REGEX,
    };

    const qualities = {
      SD: QUALITY_SD_REGEX,
      HD: QUALITY_HD_REGEX,
      FHD: QUALITY_FHD_REGEX,
      UHD: QUALITY_UHD_REGEX,
    };

    const audio = (matches(content.audio, audios) ?? Audio.UNKNOWN) as Audio;
    const quality = (matches(content.quality, qualities) ??
      Quality.UNKNOWN) as Quality;

    return { ...content, audio, quality };
  }

  private formatSeries(
    content: DelegateSeriesProviders,
  ): DelegateSeriesProviders {
    return content;
  }
}
