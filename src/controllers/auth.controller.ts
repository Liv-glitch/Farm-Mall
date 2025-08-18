import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { validateRegisterRequest, validateLoginRequest, validateChangePasswordRequest } from '../utils/validators';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';
import { env } from '../config/environment';
import {
  RegisterRequest,
  LoginRequest,
  ChangePasswordRequest,
  PasswordResetRequest,
  VerifyEmailRequest,
  VerifyPhoneRequest,
  User
} from '../types/auth.types';

// Extend Request interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user: User;
}

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Register new user
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = validateRegisterRequest(req.body);
      if (!validationResult.isValid) {
        console.error('Registration validation failed:', {
          errors: validationResult.errors,
          requestBody: req.body,
          endpoint: '/api/v1/auth/register'
        });
        
        logError('Registration validation failed', new Error('Validation failed'), {
          errors: validationResult.errors,
          requestBody: req.body,
          endpoint: '/api/v1/auth/register',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors,
        });
        return;
      }

      const registerData: RegisterRequest = req.body;
      const result = await this.authService.register(registerData);

      logInfo('User registered successfully', { userId: result.user.id });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Detailed registration error:', error);
      logError('Registration failed', error, {
        ...req.body,
        error: error.message,
        stack: error.stack
      });

      if (error.message === ERROR_CODES.EMAIL_ALREADY_EXISTS) {
        res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'Email already exists',
          code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
        });
        return;
      }

      if (error.message === ERROR_CODES.PHONE_ALREADY_EXISTS) {
        res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: 'Phone number already exists',
          code: ERROR_CODES.PHONE_ALREADY_EXISTS,
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Login user
  async login(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = validateLoginRequest(req.body);
      if (!validationResult.isValid) {
        console.error('Login validation failed:', {
          errors: validationResult.errors,
          requestBody: req.body,
          endpoint: '/api/v1/auth/login'
        });
        
        logError('Login validation failed', new Error('Validation failed'), {
          errors: validationResult.errors,
          requestBody: req.body,
          endpoint: '/api/v1/auth/login',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors,
        });
        return;
      }

      const loginData: LoginRequest = req.body;
      const result = await this.authService.login(loginData);

      logInfo('User logged in successfully', { userId: result.user.id });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error: any) {
      console.error('Detailed login error:', {
        error: error.message,
        stack: error.stack,
        identifier: req.body.identifier,
        errorType: error.constructor.name
      });
      
      logError('Login failed', error, { 
        identifier: req.body.identifier,
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.constructor.name,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      });

      if (error.message === ERROR_CODES.INVALID_CREDENTIALS) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid credentials',
          code: ERROR_CODES.INVALID_CREDENTIALS,
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Refresh access token
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Refresh token is required',
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        });
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error: any) {
      logError('Token refresh failed', error);

      if (error.message === ERROR_CODES.REFRESH_TOKEN_INVALID) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid refresh token',
          code: ERROR_CODES.REFRESH_TOKEN_INVALID,
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Logout user
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const accessToken = req.get('Authorization')?.replace('Bearer ', '') || '';
      const { refreshToken } = req.body;

      await this.authService.logout(userId, accessToken, refreshToken);

      logInfo('User logged out successfully', { userId });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error: any) {
      logError('Logout failed', error, { userId: req.user?.id });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Change password
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validationResult = validateChangePasswordRequest(req.body);
      if (!validationResult.isValid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors,
        });
        return;
      }

      const userId = req.user.id;
      const passwordData: ChangePasswordRequest = req.body;

      await this.authService.changePassword(userId, passwordData);

      logInfo('Password changed successfully', { userId });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logError('Password change failed', error, { userId: req.user?.id });

      if (error.message === ERROR_CODES.USER_NOT_FOUND) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found',
          code: ERROR_CODES.USER_NOT_FOUND,
        });
        return;
      }

      if (error.message === ERROR_CODES.INVALID_CREDENTIALS) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Current password is incorrect',
          code: ERROR_CODES.INVALID_CREDENTIALS,
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Request password reset
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { identifier }: PasswordResetRequest = req.body;

      if (!identifier) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Email or phone number is required',
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        });
        return;
      }

      await this.authService.requestPasswordReset({ identifier });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password reset instructions sent',
      });
    } catch (error: any) {
      logError('Password reset request failed', error, { identifier: req.body.identifier });

      if (error.message === ERROR_CODES.USER_NOT_FOUND) {
        // Don't reveal if user exists for security
        res.status(HTTP_STATUS.OK).json({
          success: true,
          message: 'Password reset instructions sent',
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Reset password
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Token and new password are required',
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        });
        return;
      }

      await this.authService.resetPassword(token, newPassword);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error: any) {
      logError('Password reset failed', error);

      if (error.message === ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid or expired reset token',
          code: ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Verify email
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token }: VerifyEmailRequest = req.body;

      if (!token) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Verification token is required',
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        });
        return;
      }

      await this.authService.verifyEmail(token);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      logError('Email verification failed', error);

      if (error.message === ERROR_CODES.TOKEN_INVALID) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid verification token',
          code: ERROR_CODES.TOKEN_INVALID,
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Verify phone
  async verifyPhone(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, verificationCode }: VerifyPhoneRequest = req.body;

      if (!phoneNumber || !verificationCode) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Phone number and verification code are required',
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        });
        return;
      }

      await this.authService.verifyPhone(phoneNumber, verificationCode);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Phone number verified successfully',
      });
    } catch (error: any) {
      logError('Phone verification failed', error);

      if (error.message === ERROR_CODES.TOKEN_INVALID) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid verification code',
          code: ERROR_CODES.TOKEN_INVALID,
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get current user profile
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const user = await this.authService.getUserById(userId);

      if (!user) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found',
          code: ERROR_CODES.USER_NOT_FOUND,
        });
        return;
      }

      const userResponse = user.toJSON();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user: userResponse },
      });
    } catch (error: any) {
      logError('Get profile failed', error, { userId: req.user?.id });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update user profile
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { fullName, phoneNumber, county, subCounty, profilePictureUrl } = req.body;

      const updatedUser = await this.authService.updateUserProfile(userId, {
        fullName,
        phoneNumber,
        county,
        subCounty,
        profilePictureUrl,
      });

      if (!updatedUser) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found',
          code: ERROR_CODES.USER_NOT_FOUND,
        });
        return;
      }

      logInfo('Profile updated successfully', { userId });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser.toJSON() },
      });
    } catch (error: any) {
      logError('Update profile failed', error, { userId: req.user?.id });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Bot authentication - get user data by phone number with API key and generate tokens
  async botAuth(req: Request, res: Response): Promise<void> {
    try {
      const { phone, apiKey } = req.query;

      // Validate API key
      if (!apiKey || apiKey !== env.BOT_API_KEY) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid or missing API key',
          code: ERROR_CODES.INVALID_CREDENTIALS,
        });
        return;
      }

      // Validate phone number
      if (!phone || typeof phone !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Phone number is required',
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        });
        return;
      }

      // Get user with all related data and generate authentication tokens
      const result = await this.authService.botAuthWithTokens(phone);

      if (!result) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found',
          code: ERROR_CODES.USER_NOT_FOUND,
        });
        return;
      }

      logInfo('Bot authentication with tokens successful', { 
        userId: result.user.id, 
        phone: phone.toString().substring(0, 8) + '***' // Log partial phone for privacy
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User authenticated successfully',
        data: result,
      });
    } catch (error: any) {
      logError('Bot authentication failed', error, { 
        phone: req.query.phone?.toString().substring(0, 8) + '***' 
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }
} 