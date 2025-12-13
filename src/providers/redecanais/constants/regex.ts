export const RAW_REGEX = /(.*)<a\s*href=".*"\s*target=".*">/g;
export const TITLE_REGEX_1 = /^(.+?)(?:\s*\([^)]*\))(?=\s+-\s*|$)/;
export const TITLE_REGEX_2 = /^(.+?)(?:\s*\([^)]*\))?(?=\s+-\s*|$)/;
export const AUDIO_REGEX =
  /\s\((Dublado|Dubaldo|Duiblado|Legendado|Legendaod|Nacional|Dublado\s\/\sLegendado|Mudo|Original)\)\s[-]?/;
export const AUDIO_URL_REGEX_1 =
  /.*<a\s*href=".*-(dublado|dubaldo|duiblado|legendado|legendaod|nacional)(?:-)?.*"\s*target=".*">/;
export const AUDIO_URL_REGEX_2 =
  /.*-(dublado|dubaldo|duiblado|legendado|legendaod|nacional)(?:-)?.*/i;
export const QUALITY_REGEX =
  /[-]?\s(180p|480p|720p|7200p|1008p|1080p|2160p\s\(4K\))\s[-]?/;
export const QUALITY_URL_REGEX =
  /.*<a\s*href=".*-(180p|480p|720p|7200p|1008p|1080p|2160p-4k)(?:-)?.*"\s*target=".*">/;
export const URL_REGEX = /.*<a\s*href="(.*)"\s*target=".*">/;

export const AUDIO_DUBBED_REGEX = /(dublado|dubaldo|duiblado)/i;
export const AUDIO_SUBTITLED_REGEX = /(legendado|legendaod)/i;
export const AUDIO_NATIONAL_REGEX = /(nacional)/i;
export const AUDIO_MUTED_REGEX = /(mudo)/i;
export const AUDIO_ORIGINAL_REGEX = /(original)/i;

export const QUALITY_SD_REGEX = /(480p)/i;
export const QUALITY_HD_REGEX = /(720p|7200p)/i;
export const QUALITY_FHD_REGEX = /(180p|1008p|1080p)/i;
export const QUALITY_UHD_REGEX = /(2160p\s\(4K\)|2160p-4k)/i;

export const EPISODE_TITLE_REGEX =
  /(?:epis[o|ó]dio\s*\d+\s*-\s*)?(.*?)(?=\s*-\s*)/i;
