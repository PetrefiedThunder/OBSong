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
