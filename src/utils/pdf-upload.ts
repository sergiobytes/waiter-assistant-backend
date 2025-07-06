import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Request } from 'express';
import * as multer from 'multer';

export const pdfUploadOptions: MulterOptions = {
  storage: multer.memoryStorage(),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};
