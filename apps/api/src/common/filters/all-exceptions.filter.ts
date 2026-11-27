import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** 统一异常响应：{ code, message, path, timestamp } */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '服务内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const obj = body as { message?: string | string[]; error?: string };
        message = Array.isArray(obj.message) ? obj.message.join('; ') : obj.message ?? message;
        code = obj.error ?? `HTTP_${status}`;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(`未知异常: ${JSON.stringify(exception)}`);
    }

    response.status(status).json({
      code,
      message,
      path: request.url,
      timestamp: Date.now(),
    });
  }
}
