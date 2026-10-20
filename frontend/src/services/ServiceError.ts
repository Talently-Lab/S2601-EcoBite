export type ServiceErrorOptions = ErrorOptions & { status?: number; code?: string };

export class ServiceError extends Error {
    readonly status?: number;
    readonly code?: string;

    constructor(message: string, { status, code, ...options }: ServiceErrorOptions = {}) {
        super(message, options);
        this.name = 'ServiceError';
        this.status = status;
        this.code = code;
    }
}
