/**
 * Standard API success response wrapper.
 */
export interface ApiResponse<T = unknown> {
  /** Indicates the request succeeded. */
  success: true;
  /** Response payload. */
  data: T;
  /** Optional success message. */
  message?: string;
}

/**
 * Standard API error response wrapper.
 */
export interface ApiErrorResponse {
  /** Indicates the request failed. */
  success: false;
  /** Error payload. */
  error: {
    /** Machine-readable error code. */
    code: string;
    /** Human-readable message. */
    message: string;
    /** Additional diagnostic details. */
    details?: unknown;
  };
}

/**
 * Health check response describing service uptime.
 */
export interface HealthCheckResponse {
  /** Status indicator. */
  status: 'ok' | 'degraded' | 'down';
  /** ISO timestamp when the status was generated. */
  timestamp: string;
  /** Optional service version. */
  version?: string;
  /** Optional uptime in seconds. */
  uptime?: number;
}
