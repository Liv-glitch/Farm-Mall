import { Request, Response } from 'express';
import { env } from '../config/environment';
import { logInfo, logError } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Multer config for health upload
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = 'uploads/temp';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

export class PlantIdHealthController {
  public uploadMiddleware = upload.single('image');

  public async proxyHealthAssessment(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = env.PLANTID_API_KEY;
      if (!apiKey) {
        res.status(500).json({ success: false, message: 'Plant.id API key not configured' });
        return;
      }

      // Forward the JSON body as-is
      const url = 'https://plant.id/api/v3/health_assessment?details=local_name,description,url,treatment,classification,common_names,cause&language=en';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      const contentType = response.headers.get('content-type') || '';
      let responseData: any;
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        logError('❌ Plant.id health_assessment API error', new Error(`Status: ${response.status}`), {
          status: response.status,
          statusText: response.statusText,
          error: responseData
        });
        res.status(response.status).json({
          success: false,
          message: 'Plant.id API error',
          status: response.status,
          error: responseData
        });
        return;
      }

      logInfo('✅ Plant.id health_assessment API success', {
        status: response.status,
        hasResult: !!responseData.result
      });
      res.json({ success: true, data: responseData });
    } catch (error: any) {
      logError('Plant.id health_assessment proxy failed', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  }

  // New: handle multipart/form-data image upload for health assessment
  public async healthAssessmentUpload(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = env.PLANTID_API_KEY;
      if (!apiKey) {
        res.status(500).json({ success: false, message: 'Plant.id API key not configured' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Image file is required' });
        return;
      }
      // Get optional fields
      const latitude = req.body.latitude ? parseFloat(req.body.latitude) : 49.207;
      const longitude = req.body.longitude ? parseFloat(req.body.longitude) : 16.608;
      const similarImages = req.body.similar_images === 'false' ? false : true;

      // Convert image to base64
      const imageBuffer = await fs.readFile(req.file.path);
      const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;

      // Build payload
      const payload = {
        images: [base64Image],
        latitude,
        longitude,
        similar_images: similarImages
      };

      // Plant.id API call
      const url = 'https://plant.id/api/v3/health_assessment?details=local_name,description,url,treatment,classification,common_names,cause&language=en';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Clean up temp file
      await fs.unlink(req.file.path).catch(() => {});

      const contentType = response.headers.get('content-type') || '';
      let responseData: any;
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        logError('❌ Plant.id health_assessment upload API error', new Error(`Status: ${response.status}`), {
          status: response.status,
          statusText: response.statusText,
          error: responseData
        });
        res.status(response.status).json({
          success: false,
          message: 'Plant.id API error',
          status: response.status,
          error: responseData
        });
        return;
      }

      logInfo('✅ Plant.id health_assessment upload API success', {
        status: response.status,
        hasResult: !!responseData.result
      });
      res.json({ success: true, data: responseData });
    } catch (error: any) {
      logError('Plant.id health_assessment upload failed', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  }
}

export const plantIdHealthController = new PlantIdHealthController(); 