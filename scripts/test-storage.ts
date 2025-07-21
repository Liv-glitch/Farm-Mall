import { FileStorageService } from '../src/services/fileStorage.service';
import { v4 as uuid } from 'uuid';

async function testStorage() {
  try {
    console.log('🔍 Starting Supabase Storage Test...');
    
    const fileStorageService = new FileStorageService();
    console.log('✅ Storage service initialized');

    // Test file data
    const testUserId = uuid();
    const testImageBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const testFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: testImageBuffer,
      size: testImageBuffer.length,
      stream: null as any,
      destination: '',
      filename: 'test-image.jpg',
      path: ''
    };

    // Test 1: Upload file
    console.log('\n📤 Testing file upload...');
    const uploadResult = await fileStorageService.uploadFile(
      testUserId,
      testFile,
      'plant-image',
      {
        generateThumbnail: true,
        isPublic: true,
        metadata: {
          test: 'true',
          environment: 'production'
        }
      }
    );
    console.log('✅ File uploaded successfully');
    console.log('📝 Upload details:', {
      url: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      fileName: uploadResult.fileName
    });

    // Test 2: List files
    console.log('\n📋 Testing file listing...');
    const files = await fileStorageService.listFiles(`plant-image/${testUserId}`);
    console.log('✅ Files listed successfully');
    console.log('📝 Files found:', files?.length || 0);

    // Test 3: Generate signed URL
    console.log('\n🔐 Testing signed URL generation...');
    const signedUrl = await fileStorageService.generateSignedUrl(uploadResult.fileName);
    console.log('✅ Signed URL generated successfully');
    console.log('📝 Signed URL:', signedUrl);

    // Test 4: Get S3 credentials
    console.log('\n🔑 Testing S3 credentials retrieval...');
    const s3Creds = await fileStorageService.getS3Credentials();
    console.log('✅ S3 credentials retrieved successfully');
    console.log('📝 Endpoint:', s3Creds.endpoint);

    // Test 5: Clean up
    console.log('\n🧹 Cleaning up test files...');
    await fileStorageService.deleteFile(uploadResult.fileName);
    console.log('✅ Test files cleaned up successfully');

    console.log('\n✨ All storage tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during storage test:', error);
    process.exit(1);
  }
}

// Run the test
testStorage(); 