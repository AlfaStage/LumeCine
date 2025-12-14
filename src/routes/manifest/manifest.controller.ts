import { EnvService } from '@/modules/env/env.service';
import { ManifestService } from '@/routes/manifest/manifest.service';
import { Controller, Get } from '@nestjs/common';
import * as packageJson from '@package';

@Controller('/manifest.json')
export class ManifestController {
  public constructor(
    private readonly envService: EnvService,
    private readonly manifestService: ManifestService,
  ) {}

  @Get('/')
  public async get(): Promise<any> {
    const catalogs = await this.manifestService.getCatalogs();

    return {
      id: packageJson.stremio.id,
      version: packageJson.version,
      name: packageJson.stremio.name,
      description: packageJson.stremio.description,
      logo: this.envService.get('APP_URL').concat('/public/images/logo.png'),
      resources: ['catalog', 'meta', 'stream'],
      idPrefixes: ['lumecine', 'tt'],
      types: ['movie', 'series'],
      stremioAddonsConfig: {
        issuer: 'https://stremio-addons.net',
        signature:
          'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..7zICmCSHsqJFg-mhePjRZA.BL8Er2HpSDYpLE51lPOkWmLnACgg4HFHe8IQgkDKz5nlU0FOhZoOsownvYPAmMbpZmFy4_WZCSfPHyw38om27jIomGds-mdQeRnCFMRrp4I4vuTNSSBpX3vyvQAYThyM.FuCigw9HEIZ3jvMKmhlwrg',
      },
      catalogs,
    };
  }
}
