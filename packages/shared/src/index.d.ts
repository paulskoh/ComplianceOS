export * from './schemas/auth.schema';
export * from './schemas/user.schema';
export * from './schemas/obligation.schema';
export * from './schemas/control.schema';
export * from './schemas/artifact.schema';
export * from './schemas/risk.schema';
export * from './schemas/inspection-pack.schema';
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
