# JWT Authentication Refactoring Plan

## Overview

This document outlines the migration from the current session-based authentication to a JWT-based system.

## Current State

- **Framework**: `express-session` middleware
- **Storage**: PostgreSQL-backed session store (`sessions` table)
- **Transport**: HTTP-only cookie (`theatre.sid`)
- **Flow**: Session ID → session lookup → `req.session.userId` → user lookup

## Target State

- **Framework**: JWT tokens with `jsonwebtoken`
- **Storage**: Stateless tokens, optional refresh token table in PostgreSQL
- **Transport**: HTTP-only cookies and/or Authorization header
- **Flow**: JWT → verify signature → extract userId → user lookup

---

## Phase 1: Foundation (Non-breaking)

- [x] Add dependencies:
  ```bash
  npm install jsonwebtoken
  npm install --save-dev @types/jsonwebtoken
  ```
- [x] Create `server/src/auth/jwt.ts` with:
  - `signToken(userId: string, type: 'access' | 'refresh')` - generates signed JWT with configurable expiry
  - `verifyToken(token: string)` - validates and returns payload
  - `JWT_CONFIG` with secret, access expiry (15min), refresh expiry (7 days)
  - Secret sourced from `config.jwtSecret`

---

## Phase 2: Dual-Run Transition

- [ ] Create middleware `server/src/middleware/authenticateJWT.ts`:
  - Reads JWT from `Authorization: Bearer <token>` header
  - Falls back to HTTP-only cookie (`theatre.jwt`)
  - Validates token signature
  - Decodes and attaches user to `req.user`
  - Catches and handles `JsonWebTokenError` / `TokenExpiredError`

- [ ] Update `requireAuth` middleware to accept either session OR JWT

- [ ] Add `usersRefresh` controller for token refresh

- [ ] Keep `express-session` middleware active (will be removed later)

---

## Phase 3: Controller Updates

### Login (`usersLogin`)

- [ ] Generate access + refresh JWT pair
- [ ] Send access token in HTTP-only cookie (`theatre.jwt`)
- [ ] Return refresh token in HTTP-only cookie (`theatre.refresh`)
- [ ] Store refresh token hash in database

### Register (`usersRegister`)

- [ ] Same treatment as login (auto-login on registration)

### Logout (`usersLogout`)

- [ ] Delete refresh token from database (mark as revoked)
- [ ] Clear JWT cookies (`theatre.jwt`, `theatre.refresh`)
- [ ] Optionally: Add access token JTI to denylist

### New: Refresh (`usersRefresh`)

- [ ] Accept refresh token from HTTP-only cookie
- [ ] Verify refresh token exists and is not revoked
- [ ] Generate new access token + new refresh token (rotation)
- [ ] Return new access token in cookie
- [ ] Return new refresh token in cookie
- [ ] Mark old refresh token as revoked

### Me (`usersMe`)

- [ ] Already works via `requireAuth` which will use JWT

---

## Phase 4: Database Changes

### Option A: Refresh Token Table (Recommended)

```typescript
// server/src/db/schema/refresh_tokens.sql.ts
import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked: boolean("revoked").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

Queries needed:

- `createRefreshToken(userId: string, hash: string, expiresAt: Date)`
- `getRefreshToken(hash: string)` - returns token with user
- `revokeRefreshToken(id: string)` - soft delete
- `revokeAllUserRefreshTokens(userId: string)` - for logout everywhere

### Option B: Token Denylist (For access tokens)

```typescript
// server/src/db/schema/token_denylist.sql.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tokenDenylist = pgTable("token_denylist", {
  jti: text("jti").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
```

- Store JWT ID (`jti` claim) when logging out
- Check denylist on token verification
- Prune expired entries periodically

---

## Phase 5: Client Updates

### Update `client/src/api/auth.ts`

- [ ] Update `login` to handle JWT response (no change needed if using cookies)
- [ ] Update `logout` to clear tokens
- [ ] Add `refreshToken` function

### Update `client/src/api/client.ts`

- [ ] Configure axios to send credentials (cookies)
- [ ] Add request interceptor for token refresh on 401

```typescript
// Example interceptor pattern
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await refreshToken();
        return axios(error.config);
      } catch {
        // Redirect to login
      }
    }
    return Promise.reject(error);
  },
);
```

---

## Phase 6: Cleanup

- [ ] Remove `express-session` dependency
- [ ] Remove `server/src/middleware/session.ts`
- [ ] Remove `server/src/db/sessionStore.ts`
- [ ] Remove `server/src/db/schema/sessions.sql.ts`
- [ ] Remove session-related types from `server/src/types/session.d.ts`
- [ ] Drop `sessions` table from database (migration)
- [ ] Update all tests to use JWT
- [ ] Remove dual-mode logic from `requireAuth`
- [ ] Final verification of all endpoints

---

## Key Design Decisions

### Token Storage

- **Recommended**: HTTP-only cookies for both access and refresh tokens
  - More secure against XSS (can't be read by JavaScript)
  - CSRF protection via `sameSite: strict` or `lax`
- Alternative: Access token in cookie, refresh token in memory (cleared on page unload)

### Token Expiry

- **Access token**: 15 minutes (short-lived for security)
- **Refresh token**: 7 days (longer-lived, can be revoked)

### Refresh Token Rotation

- Issue a new refresh token on every refresh request
- Mark old refresh token as revoked
- Prevents refresh token theft from being permanent

### Revocation Strategy

- Refresh tokens are stored in database and can be revoked
- Access tokens: rely on short expiry + denylist for immediate logout
- On logout: revoke refresh token, add access token JTI to denylist

### Secret Management

- Use environment variable `JWT_SECRET`
- Should be long, random string (32+ bytes)
- Rotate on compromise

---

## Security Considerations

1. **Always use HTTPS** - JWTs in cookies require secure context
2. **HTTP-only cookies** - Prevents XSS from reading tokens
3. **SameSite cookies** - `strict` or `lax` for CSRF protection
4. **Short access token expiry** - Limits window of exposure
5. **Refresh token rotation** - Compromised refresh token can only be used once
6. **No sensitive data in JWT** - Tokens are base64 encoded, not encrypted
7. **Token binding** - Consider binding tokens to IP/fingerprint (optional)

---

## Rollout Strategy

1. Implement Phase 1-2 on a feature branch
2. Test dual-mode authentication
3. Implement Phase 3-4
4. Test client integration
5. Implement Phase 5
6. Test full flow end-to-end
7. Implement Phase 6 (remove old code)
8. Merge and deploy

---

## Files to Create/Modify

### New Files

- `server/src/auth/jwt.ts`
- `server/src/middleware/authenticateJWT.ts`
- `server/src/db/schema/refresh_tokens.sql.ts`
- `server/src/db/queries/refreshTokens.ts`
- Migration for `refresh_tokens` table

### Modified Files

- `server/package.json` - add jsonwebtoken
- `server/src/config.ts` - add jwtSecret
- `server/src/middleware/requireAuth.ts` - add JWT support
- `server/src/controllers/users.ts` - update login/register/logout
- `server/src/routes/users.ts` - add refresh endpoint
- `server/src/server.ts` - remove sessionMiddleware, add JWT cookie parsing
- `client/src/api/auth.ts` - update for JWT flow
- `client/src/api/client.ts` - add interceptors
- All test files

### Deleted Files

- `server/src/middleware/session.ts`
- `server/src/db/sessionStore.ts`
- `server/src/db/schema/sessions.sql.ts`
- `server/src/types/session.d.ts`
