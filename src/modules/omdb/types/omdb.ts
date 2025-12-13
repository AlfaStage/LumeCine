/**
 * OMDB API content type
 */
export type OmdbType = 'movie' | 'series' | 'episode';

/**
 * OMDB API search result item
 */
export interface OmdbSearchItem {
  Title: string;
  Year: string;
  imdbID: string;
  Type: OmdbType;
  Poster: string;
}

/**
 * OMDB API search response
 */
export interface OmdbSearchResponse {
  Search?: OmdbSearchItem[];
  totalResults?: string;
  Response: 'True' | 'False';
  Error?: string;
}

/**
 * OMDB API rating from external sources
 */
export interface OmdbRating {
  Source: string;
  Value: string;
}

/**
 * OMDB API detailed movie/series response
 */
export interface OmdbDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: OmdbRating[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: OmdbType;
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  // Series-specific fields
  totalSeasons?: string;
  Response: 'True' | 'False';
  Error?: string;
}

/**
 * Cache entry with TTL
 */
export interface OmdbCacheEntry<T> {
  data: T;
  expiresAt: number;
}
