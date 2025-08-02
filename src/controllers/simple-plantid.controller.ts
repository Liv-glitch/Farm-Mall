import { Request, Response } from 'express';
import { env } from '../config/environment';
import { logInfo, logError } from '../utils/logger';
import { PlantIdentificationModel } from '../models/PlantIdentification.model';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Configure multer for image uploads
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

export class SimplePlantIdController {
  public uploadMiddleware = upload.single('image1');

  // Simple Plant.id identification - matches your Postman request exactly
  public async identify(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = env.PLANTID_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          success: false,
          message: 'Plant.id API key not configured'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
        return;
      }

      // Get form data exactly like Postman
      const latitude = req.body.latitude || '49.207';
      const longitude = req.body.longitude || '16.608';
      const similarImages = req.body.similar_images || 'true';

      logInfo('🚀 Simple Plant.id API Request', {
        fileName: req.file.originalname,
        latitude,
        longitude,
        similarImages
      });

             // Convert image to base64 for Plant.id API
       const imageBuffer = await fs.readFile(req.file.path);
       const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;

       // Plant.id API URL with all the variables you mentioned
       const url = 'https://plant.id/api/v3/identification?' + 
         'details=common_names,url,description,taxonomy,rank,gbif_id,inaturalist_id,image,synonyms,edible_parts,watering,propagation_methods&' +
         'language=en';

       // Create JSON payload for Plant.id API
       const requestBody = {
         images: [base64Image],
         similar_images: similarImages === 'true',
         latitude: parseFloat(latitude),
         longitude: parseFloat(longitude)
       };

       // Make the API call
       const response = await fetch(url, {
         method: 'POST',
         headers: {
           'Api-Key': apiKey,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify(requestBody)
       });

      // Clean up temp file
      await fs.unlink(req.file.path).catch(() => {});

      if (!response.ok) {
        const errorText = await response.text();
        logError('❌ Plant.id API Error', new Error(`Status: ${response.status}`), {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        
        res.status(response.status).json({
          success: false,
          message: 'Plant.id API error',
          status: response.status,
          error: errorText
        });
        return;
      }

      const responseData = await response.json();

      logInfo('✅ Plant.id API Success', {
        hasResult: !!responseData.result,
        modelVersion: responseData.model_version
      });

      // Save to database if we have user info and successful result
      let savedRecord = null;
      const userId = req.user?.id || req.body.userId;
      
      if (userId && responseData.result) {
        try {
          // Create a simple imageUrl since we're not using enterprise media service here
          const imageUrl = `temp/${req.file.filename}`;
          
          // Extract confidence score from the response
          let confidenceScore = 0;
          if (responseData.result.classification?.suggestions?.length > 0) {
            confidenceScore = responseData.result.classification.suggestions[0].probability;
          }

          savedRecord = await PlantIdentificationModel.create({
            userId,
            imageUrl,
            originalFilename: req.file.originalname,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            identificationResult: responseData.result,
            confidenceScore
          });

          logInfo('💾 Plant identification saved to database', {
            recordId: savedRecord.id,
            userId,
            confidence: confidenceScore
          });
        } catch (dbError: any) {
          logError('Failed to save plant identification to database', dbError, { userId });
          // Don't fail the request if database save fails
        }
      }

      res.json({
        success: true,
        data: responseData,
        metadata: savedRecord ? {
          recordId: savedRecord.id,
          savedAt: savedRecord.createdAt
        } : undefined
      });

    } catch (error: any) {
      logError('Simple Plant.id identification failed', error);
      
      // Clean up temp file on error
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

export const simplePlantIdController = new SimplePlantIdController(); 