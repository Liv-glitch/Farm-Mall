import { Request, Response } from 'express';
import { logError, logInfo } from '../utils/logger';
import { ssoService, SsoError } from '../services/sso.service';

export class SsoController {
  async createCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const redirectPath = typeof req.body?.redirect === 'string' ? req.body.redirect : undefined;
      const result = await ssoService.createCode(userId, redirectPath);

      logInfo('Inputs marketplace SSO code created', {
        userId,
        redirectPath: result.redirectPath,
        expiresAt: result.expiresAt,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to create inputs marketplace SSO code', err, { userId: req.user?.id });
      res.status(500).json({
        success: false,
        message: 'Failed to create marketplace sign-in link',
      });
    }
  }

  async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      if (!ssoService.hasValidApiKey(req.headers.authorization, req.headers['x-sso-api-key'])) {
        res.status(401).json({
          success: false,
          message: 'Invalid SSO API key',
          code: 'unauthorized',
        });
        return;
      }

      const code = typeof req.body?.code === 'string' ? req.body.code : '';
      const result = await ssoService.verifyCode(code);

      logInfo('Inputs marketplace SSO code verified', {
        userId: result.user.id,
      });

      res.json(result);
    } catch (error) {
      const err = error as Error;
      const status = error instanceof SsoError ? error.status : 500;
      const code = error instanceof SsoError ? error.code : 'sso_verify_failed';
      logError('Failed to verify inputs marketplace SSO code', err);

      res.status(status).json({
        success: false,
        message: err.message || 'Failed to verify SSO code',
        code,
      });
    }
  }
}

export const ssoController = new SsoController();
