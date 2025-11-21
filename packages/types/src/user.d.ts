/**
 * User account representation (stub for future implementation).
 */
export interface User {
    /** Unique user identifier. */
    id: string;
    /** User email. */
    email: string;
    /** Display name. */
    displayName?: string;
    /** Account creation date. */
    createdAt: Date;
    /** Last login timestamp. */
    lastLoginAt?: Date;
}
/**
 * Authentication token response returned by auth services.
 */
export interface AuthTokenResponse {
    /** JWT or session token. */
    token: string;
    /** Token expiration timestamp. */
    expiresAt?: Date;
    /** User information. */
    user: User;
}
//# sourceMappingURL=user.d.ts.map