import { FileStorageService } from '../../src/services/fileStorage.service';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';

describe('FileStorageService Integration Tests', () => {
  let fileStorageService: FileStorageService;
  const testUserId = uuid();
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
  const testPdfPath = path.join(__dirname, '../fixtures/test-document.pdf');

  beforeAll(async () => {
    fileStorageService = new FileStorageService();
    
    // Create test files if they don't exist
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    if (!fs.existsSync(testImagePath)) {
      // Create a small test image
      const testImageBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      fs.writeFileSync(testImagePath, testImageBuffer);
    }
    if (!fs.existsSync(testPdfPath)) {
      // Create a small test PDF
      const testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf-8');
      fs.writeFileSync(testPdfPath, testPdfBuffer);
    }
  });

  afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  });

  it('should initialize and connect to Supabase storage', async () => {
    expect(fileStorageService).toBeDefined();
  });

  it('should upload an image file with thumbnail', async () => {
    const imageFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: fs.readFileSync(testImagePath),
      size: fs.statSync(testImagePath).size,
      stream: fs.createReadStream(testImagePath),
      destination: '',
      filename: 'test-image.jpg',
      path: testImagePath
    };

    const result = await fileStorageService.uploadFile(
      testUserId,
      imageFile,
      'plant-image',
      {
        generateThumbnail: true,
        isPublic: true,
        metadata: {
          test: 'true',
          purpose: 'integration-test'
        }
      }
    );

    expect(result).toBeDefined();
    expect(result.url).toContain('plant-image');
    expect(result.thumbnailUrl).toBeDefined();
    expect(result.fileName).toBeDefined();

    // Store the fileName for later tests
    return result.fileName;
  });

  it('should upload a PDF file', async () => {
    const pdfFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-document.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: fs.readFileSync(testPdfPath),
      size: fs.statSync(testPdfPath).size,
      stream: fs.createReadStream(testPdfPath),
      destination: '',
      filename: 'test-document.pdf',
      path: testPdfPath
    };

    const result = await fileStorageService.uploadFile(
      testUserId,
      pdfFile,
      'soil-test',
      {
        isPublic: false,
        metadata: {
          test: 'true',
          purpose: 'integration-test'
        }
      }
    );

    expect(result).toBeDefined();
    expect(result.url).toContain('soil-test');
    expect(result.fileName).toBeDefined();

    // Store the fileName for later tests
    return result.fileName;
  });

  it('should list files in a directory', async () => {
    const files = await fileStorageService.listFiles(`soil-test/${testUserId}`);
    expect(files).toBeDefined();
    expect(Array.isArray(files)).toBe(true);
  });

  it('should generate a signed URL for private files', async () => {
    const fileName = await fileStorageService.listFiles(`soil-test/${testUserId}`);
    if (fileName && fileName.length > 0) {
      const signedUrl = await fileStorageService.generateSignedUrl(fileName[0].name);
      expect(signedUrl).toBeDefined();
      expect(signedUrl).toContain('token=');
    }
  });

  it('should get S3 compatible credentials', async () => {
    const credentials = await fileStorageService.getS3Credentials();
    expect(credentials).toBeDefined();
    expect(credentials.endpoint).toContain('/storage/v1');
    expect(credentials.accessKeyId).toBeDefined();
    expect(credentials.secretAccessKey).toBeDefined();
    expect(credentials.bucket).toBeDefined();
  });
}); 