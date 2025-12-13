import { RedeCanaisUrlService } from '@/providers/redecanais/services/url.service';
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class RedeCanaisApiService {
  public readonly http: AxiosInstance;

  public constructor(private readonly urlService: RedeCanaisUrlService) {
    this.http = axios.create();

    this.http.interceptors.request.use((config) => {
      config.baseURL = this.urlService.url;
      config.headers.set('Referer', this.urlService.url);
      return config;
    });
  }
}
