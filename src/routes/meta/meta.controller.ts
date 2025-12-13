import { ProvidersTrendingService } from '@/modules/providers/services/trending.service';
import { StremioService } from '@/modules/stremio/stremio.service';
import { BadRequestException, Controller, Get, Param } from '@nestjs/common';

@Controller('/meta')
export class MetaController {
  public constructor(
    private readonly stremioService: StremioService,
    private readonly providersTrendingService: ProvidersTrendingService,
  ) {}

  @Get('/:category/lumecine:section.json')
  public async getMeta(
    @Param('category') category: string,
    @Param('section') section: string,
  ) {
    const type =
      this.providersTrendingService.convertStringToContentType(category);
    const id = Number(section.slice(1));

    if (!type || Number.isNaN(id)) {
      throw new BadRequestException();
    }

    return {
      meta: await this.stremioService.getMeta({ type, id }),
    };
  }
}
