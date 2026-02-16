import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${response.statusCode} — ${elapsed}ms`,
          );
        },
        error: (error) => {
          const elapsed = Date.now() - start;
          const status = error?.status || error?.getStatus?.() || 500;
          this.logger.error(
            `${method} ${url} ${status} — ${elapsed}ms`,
          );
        },
      }),
    );
  }
}