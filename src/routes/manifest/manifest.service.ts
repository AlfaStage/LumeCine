import { PrismaService } from '@/modules/prisma/prisma.service';
import { ProvidersTrendingService } from '@/modules/providers/services/trending.service';
import { TrendingType } from '@/modules/tmdb/types/tmdb';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ManifestService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly providersTrendingService: ProvidersTrendingService,
  ) {}

  public async getCatalogs() {
    const types = ['movie', 'series'];
    const trendings = Object.values(TrendingType);

    const catalogs = await Promise.all(
      types.map(async (type) => {
        const catalogsForType = await Promise.all(
          trendings.map(async (trending) => {
            const extra = [
              {
                name: 'skip',
                isRequired: false,
                options: [],
                optionsLimit: 1,
              },
            ];

            if (trending === TrendingType.ALL) {
              extra.push({
                name: 'search',
                isRequired: false,
                options: [],
                optionsLimit: 1,
              });
            }

            switch (type) {
              case 'movie':
                extra.push(await this.getMovieGenres());
                break;

              case 'series':
                extra.push(await this.getSeriesGenres());
                break;
            }

            return {
              type,
              id: `lumecine.${trending}`,
              name: `LumeCine - ${this.providersTrendingService.convertTrendingToString(trending)}`,
              extra,
            };
          }),
        );
        return catalogsForType;
      }),
    );

    return catalogs.flat();
  }

  private async getMovieGenres() {
    const genres = await this.prismaService.movieGenre.findMany();

    return {
      name: 'genre',
      isRequired: false,
      optionsLimit: 1,
      options: genres.map((genre) => genre.name),
    };
  }

  private async getSeriesGenres() {
    const genres = await this.prismaService.seriesGenre.findMany();

    return {
      name: 'genre',
      isRequired: false,
      optionsLimit: 1,
      options: genres.map((genre) => genre.name),
    };
  }
}
