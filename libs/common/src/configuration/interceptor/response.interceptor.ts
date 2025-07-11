import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<any>();

    return next.handle().pipe(
      map((payload) => {
        // nếu payload đã là { status, data, msg } thì không wrap nữa
        if (
          payload != null &&
          typeof payload === 'object' &&
          'status' in payload &&
          'data' in payload &&
          'msg' in payload
        ) {
          return payload;
        }

        const statusCode = response.statusCode ?? HttpStatus.OK;
        return {
          status: statusCode,
          data: payload,
          msg: statusCode >= 400 ? 'error' : 'success',
        };
      }),
    );
  }
}
