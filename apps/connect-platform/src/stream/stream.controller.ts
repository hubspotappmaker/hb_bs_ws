// stream.controller.ts
import {
    Controller,
    Get,
    Header,
    Param,
    Req,
    Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StreamService } from './stream.service';

// Import ChangeStream từ driver MongoDB
import { ChangeStream } from 'mongodb';

@Controller('sse')
export class StreamController {
    constructor(private readonly streamService: StreamService) { }

    @Get('connect/:connectId')
    @Header('Content-Type', 'text/event-stream')
    @Header('Cache-Control', 'no-cache')
    @Header('Connection', 'keep-alive')
    handleSse(
        @Param('connectId') connectId: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        res.flushHeaders();

        let changeStream: ChangeStream;
        try
        {
            changeStream = this.streamService.watchConnect(connectId);
        } catch (err)
        {
            console.error(`Invalid Connect ID: ${connectId}`, err);
            res.write(`event: error\ndata: ${JSON.stringify({ message: 'Invalid Connect ID' })}\n\n`);
            res.end();
            return;
        }

        // Gửi sự kiện kết nối thành công
        res.write('event: connected\ndata: {}\n\n');

        // Heartbeat định kỳ
        const heartbeatInterval = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 25000);

        const changeHandler = (change) => {
            const fullDocument = change.fullDocument;
            if (fullDocument)
            {
                const payload = {
                    isSyncing: fullDocument.isSyncing,
                    migratedContacts: fullDocument.migratedContacts,
                    migratedOrders: fullDocument.migratedOrders,
                    migratedProducts: fullDocument.migratedProducts,
                    name: fullDocument.name,
                };
                res.write(`data: ${JSON.stringify(payload)}\n\n`);
            } else
            {
                console.warn('Change event without fullDocument', change);
                res.write(`event: warning\ndata: ${{ message: 'No document data' }}\n\n`);
            }
        };

        const errorHandler = (err) => {
            console.error('ChangeStream error:', err);
            res.write(`event: error\ndata: ${JSON.stringify({ message: 'Database stream error' })}\n\n`);
        };

        changeStream.on('change', changeHandler);
        changeStream.on('error', errorHandler);
        changeStream.on('close', () => {
            console.log(`ChangeStream closed for ${connectId}`);
            clearInterval(heartbeatInterval);
            res.end();
        });

        req.on('close', () => {
            console.log(`Client closed connection: ${connectId}`);
            clearInterval(heartbeatInterval);
            changeStream.removeAllListeners('change');
            changeStream.removeAllListeners('error');
            changeStream.close();
            res.end();
        });
    }
}
