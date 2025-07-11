import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log lỗi ra console hoặc file log
    this.logger.error('Exception thrown', exception instanceof Error ? exception.stack : JSON.stringify(exception));

    let msg: any = 'Internal server error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        msg = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        // Nếu message có kiểu array (ví dụ do class-validator trả về) thì chuyển thành chuỗi hoặc giữ nguyên array nếu cần
        msg = (exceptionResponse as any).message || 'An error occurred';
      }
    }

    response.status(status).json({
      status,
      data: null,
      msg,
    });
  }
}
