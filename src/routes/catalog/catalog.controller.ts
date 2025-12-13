import { ProvidersTrendingService } from '@/modules/providers/services/trending.service';
import { StremioService } from '@/modules/stremio/stremio.service';
import { BadRequestException, Controller, Get, Param } from '@nestjs/common';

@Controller('/catalog')
export class CatalogController {
  public constructor(
    private readonly providersTrendingService: ProvidersTrendingService,
    private readonly stremioService: StremioService,
  ) {}

  @Get([
    '/:category/lumecine.:section.json',
    '/:category/lumecine.:section/:params*.json',
  ])
  public async getCatalog(
    @Param('category') category: string,
    @Param('section') section: string,
    @Param('params') params: string,
  ) {
    const query = new URLSearchParams(params);
    const coerce = Number(query.get('skip'));

    const type =
      this.providersTrendingService.convertStringToContentType(category);
    const trending =
      this.providersTrendingService.convertStringToTrending(section);

    const search = query.get('search');
    const skip = !Number.isNaN(coerce) && coerce >= 0 ? coerce : null;
    const genre = query.get('genre');

    if (!type || !trending) {
      throw new BadRequestException();
    }

    return {
      hasMore: true,
      cacheMaxAge: 0,
      staleError: 0,
      staleRevalidate: 0,
      metas: await this.stremioService.getCatalog({
        type,
        trending,
        search,
        genre,
        skip,
      }),
    };
  }
}
