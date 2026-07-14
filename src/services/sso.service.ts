import crypto from 'crypto';
import { Op } from 'sequelize';
import { env } from '../config/environment';
import { SsoCodeModel } from '../models/SsoCode.model';
import { UserModel } from '../models/User.model';

export class SsoError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status = 400, code = 'sso_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class SsoService {
  async createCode(userId: string, redirectPath?: string) {
    const code = crypto.randomBytes(32).toString('base64url');
    const codeHash = this.hashCode(code);
    const safeRedirectPath = this.sanitizeRedirectPath(redirectPath);
    const ttlSeconds = Number.isFinite(env.INPUTS_MARKETPLACE_SSO_CODE_TTL_SECONDS)
      ? env.INPUTS_MARKETPLACE_SSO_CODE_TTL_SECONDS
      : 300;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await SsoCodeModel.create({
      userId,
      codeHash,
      redirectPath: safeRedirectPath,
      expiresAt,
    });

    const callbackUrl = new URL('/sso/callback', env.INPUTS_MARKETPLACE_BASE_URL);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('redirect', safeRedirectPath);

    return {
      url: callbackUrl.toString(),
      redirectPath: safeRedirectPath,
      expiresAt,
    };
  }

  async verifyCode(code: string) {
    if (!code || typeof code !== 'string') {
      throw new SsoError('Code is required', 400, 'missing_code');
    }

    const codeHash = this.hashCode(code);
    const now = new Date();
    const ssoCode = await SsoCodeModel.findOne({
      where: {
        codeHash,
        usedAt: null,
        expiresAt: { [Op.gt]: now },
      },
    });

    if (!ssoCode) {
      throw new SsoError('Invalid or expired SSO code', 401, 'invalid_code');
    }

    const [updatedCount] = await SsoCodeModel.update(
      { usedAt: now },
      {
        where: {
          id: ssoCode.id,
          usedAt: null,
        },
      }
    );

    if (updatedCount !== 1) {
      throw new SsoError('SSO code has already been used', 401, 'code_used');
    }

    const user = await UserModel.findByPk(ssoCode.userId);
    if (!user || !user.email) {
      throw new SsoError('Verified user is unavailable', 404, 'user_not_found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        email_verified: user.emailVerified,
      },
    };
  }

  hasValidApiKey(authorization?: string, headerApiKey?: string | string[]) {
    if (!env.INPUTS_MARKETPLACE_SSO_API_KEY) return false;

    const bearer = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
    const directKey = Array.isArray(headerApiKey) ? headerApiKey[0] : headerApiKey;

    return bearer === env.INPUTS_MARKETPLACE_SSO_API_KEY || directKey === env.INPUTS_MARKETPLACE_SSO_API_KEY;
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private sanitizeRedirectPath(redirectPath?: string): string {
    if (!redirectPath || typeof redirectPath !== 'string') return '/marketplace';

    const trimmed = redirectPath.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
      return '/marketplace';
    }

    return trimmed.slice(0, 512);
  }
}

export const ssoService = new SsoService();
export default ssoService;
