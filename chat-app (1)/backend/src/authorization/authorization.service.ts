import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================================================
// This app is locked to exactly two people. Who those two people are is
// controlled entirely by ONE environment variable — AUTHORIZED_USER_IDS, a
// comma-separated pair of existing user ids, e.g.:
//
//   AUTHORIZED_USER_IDS=3f29a1e2-...,9b7c4d01-...
//
// Nothing here is hardcoded and nothing is exposed to the browser — this
// service only ever runs on the backend. Every place in the app that needs
// to answer "is this person allowed in at all?" goes through this one
// service, so there is exactly one place to audit and exactly one place
// that can get it wrong.
//
// Fail CLOSED by design: if the variable is missing, empty, or doesn't
// contain exactly two distinct ids, we treat NO ONE as authorized rather
// than silently falling back to "allow everyone". A private two-person
// messenger that's misconfigured should refuse to serve anyone, not quietly
// become public.
// ============================================================================

@Injectable()
export class AuthorizationService implements OnModuleInit {
  private readonly logger = new Logger(AuthorizationService.name);
  private authorizedIds: string[] = [];

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const raw = this.config.get<string>('AUTHORIZED_USER_IDS') ?? '';
    const ids = Array.from(new Set(raw.split(',').map((id) => id.trim()).filter(Boolean)));
    this.authorizedIds = ids;

    if (ids.length !== 2) {
      this.logger.error(
        `AUTHORIZED_USER_IDS must contain exactly 2 comma-separated user ids. ` +
          `Found ${ids.length}. Every request will be rejected until this is fixed. ` +
          `See README for how to find your two existing user ids.`,
      );
    } else {
      this.logger.log('Authorization allowlist loaded: access restricted to 2 users.');
    }
  }

  isConfigured(): boolean {
    return this.authorizedIds.length === 2;
  }

  isAuthorized(userId: string): boolean {
    return this.isConfigured() && this.authorizedIds.includes(userId);
  }

  getAuthorizedIds(): string[] {
    return [...this.authorizedIds];
  }

  // Given one of the two authorized users, returns the other one. Returns
  // null if the given id isn't authorized or the allowlist isn't configured.
  getOtherAuthorizedId(userId: string): string | null {
    if (!this.isAuthorized(userId)) return null;
    return this.authorizedIds.find((id) => id !== userId) ?? null;
  }
}
