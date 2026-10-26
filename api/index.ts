import { app } from './server.js';
import type { IncomingMessage, ServerResponse } from 'http';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    return app(req, res);
  } catch (error: any) {
    console.error('❌ [Vercel Serverless Function Error]:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          message: 'Internal Server Error in Serverless Function',
          error: error?.message || 'Unknown error',
        })
      );
    }
  }
}

