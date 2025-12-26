// Auth schemas
export * from './schemas/auth.schema';

// User schemas
export * from './schemas/user.schema';

// Obligation schemas
export * from './schemas/obligation.schema';

// Control schemas
export * from './schemas/control.schema';

// Artifact schemas
export * from './schemas/artifact.schema';

// Risk schemas
export * from './schemas/risk.schema';

// Inspection pack schemas
export * from './schemas/inspection-pack.schema';

// Onboarding schemas
export * from './schemas/onboarding.schema';

// Compliance output schemas (SOFT-LAUNCH REQUIRED)
export * from './schemas/compliance-output.schema';

// Common types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
