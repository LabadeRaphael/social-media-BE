
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as oidc from 'openid-client';

import authConfig from 'src/config/auth.config';

@Injectable()
export class GoogleOidcService {
  private configurationPromise?: Promise<oidc.Configuration>;

  constructor(
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<
      typeof authConfig
    >,
  ) { }

  async getConfiguration(): Promise<oidc.Configuration> {
    const {
      googleClientId,
      googleClientSecret,
    } = this.authConfiguration;

    if (!googleClientId || !googleClientSecret) {
      throw new InternalServerErrorException(
        'Google sign-in is not configured',
      );
    }

    // Reuse the same discovery request after it succeeds.
    if (!this.configurationPromise) {
      this.configurationPromise = oidc.discovery(
        new URL('https://accounts.google.com'),
        googleClientId,
        googleClientSecret,
      );
    }

    try {
      return await this.configurationPromise;
    } catch (error) {
      // Allow a later request to retry if discovery fails.
      this.configurationPromise = undefined;
      throw error;
    }
  }


  async createAuthorizationRequest(
    intent: 'login'| 'change-email' | 'delete-account' = 'login',
  ) {
    const configuration = await this.getConfiguration();

    // Generate unique security values for this login attempt.
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();

    // Derive the PKCE challenge from the original verifier.
    const codeChallenge =
      await oidc.calculatePKCECodeChallenge(codeVerifier);

    // Construct Google's authorization URL.
    const authorizationUrl = oidc.buildAuthorizationUrl(
      configuration,
      {
        redirect_uri: this.authConfiguration.googleCallbackUrl,
        scope: 'openid email profile',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      },
    );

    return {
      authorizationUrl,
      state,
      nonce,
      codeVerifier,
      intent,
    };
  }

}
