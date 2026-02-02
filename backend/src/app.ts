import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes';
import { errorHandler, apiLimiter } from './middleware';

// Note: dotenv.config() is now called in server.ts before this module is imported

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(apiLimiter);

app.use('/api', routes);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Health App Backend is running');
});

app.use(errorHandler);

export default app;
