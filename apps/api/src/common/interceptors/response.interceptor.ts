import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/** 统一成功响应结构：{ code: 0, message: 'ok', data, timestamp } */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data: data ?? null,
        timestamp: Date.now(),
      })),
    );
  }
}
