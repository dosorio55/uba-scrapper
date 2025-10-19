import { Request, Response } from 'express';

const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
  });
};

export default healthCheck;
