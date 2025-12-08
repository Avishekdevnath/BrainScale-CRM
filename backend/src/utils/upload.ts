import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage
// Memory storage is serverless-compatible (works with Vercel, AWS Lambda, etc.)
// Files are stored in memory and processed immediately, not written to disk
const storage = multer.memoryStorage();

// File filter for CSV/XLSX only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const fileExt = file.originalname.toLowerCase().split('.').pop();
  
  if (allowedMimes.includes(file.mimetype) || (fileExt && allowedExtensions.includes(`.${fileExt}`))) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and XLSX files are allowed.'));
  }
};

// Note: Vercel has a 4.5MB request body limit (free and pro plans)
// Current limit is 10MB, which may need adjustment for Vercel deployment
// Consider reducing to 4MB to stay within Vercel limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max (may need to reduce to 4MB for Vercel)
  },
});

