import type { CreatedOrder, CreateOrderInput } from '../types/types';
import { ApiError, mutate } from './apiClient';
import { ServiceError, type ServiceErrorOptions } from './ServiceError';
import { isRecord } from '../utils/isRecord';

type OrderErrorOutcome = 'rejected' | 'uncertain';
type OrderErrorOptions = ServiceErrorOptions & { outcome: OrderErrorOutcome };

export class OrderError extends ServiceError {
    readonly outcome: OrderErrorOutcome;

    constructor(message: string, { outcome, ...options }: OrderErrorOptions) {
        super(message, options);
        this.name = 'OrderError';
        this.outcome = outcome;
    }
}

const uncertainMessage = 'No pudimos confirmar el resultado de la compra. La orden podría haberse creado. Verificá tus pedidos antes de volver a intentar.';

function parseOrder(data: unknown): CreatedOrder {
    const total = isRecord(data) ? data.totalAmount : undefined;
    const totalAmount = typeof total === 'number' ? total
        : typeof total === 'string' && /^\d+(?:\.\d+)?$/.test(total) ? Number(total) : NaN;

    if (!isRecord(data) || typeof data.id !== 'string' || !data.id.trim() ||
        !Number.isFinite(totalAmount) || totalAmount < 0 ||
        typeof data.co2SavedG !== 'number' || !Number.isSafeInteger(data.co2SavedG)) {
        throw new OrderError(uncertainMessage, { outcome: 'uncertain' });
    }

    const deliveryMethod = data.deliveryMethod;
    return {
        id: data.id, totalAmount, co2SavedG: data.co2SavedG,
        ...(deliveryMethod === 'BIKE' || deliveryMethod === 'MOTORCYCLE' || deliveryMethod === 'CAR'
            ? { deliveryMethod } : {}),
    };
}

const statusMessages: Record<number, string> = {
    400: 'Revisá los productos, las cantidades y la comuna de entrega antes de confirmar.',
    401: 'Tu sesión venció. Volvé a ingresar para confirmar la compra.',
    403: 'No pudimos autorizar la compra. Revisá tu sesión e intentá de nuevo.',
    404: 'El restaurante ya no está disponible. Revisá tu carrito.',
    409: 'No se pudo crear la orden con estos productos. Revisá tu carrito.',
    422: 'Revisá los datos de la compra antes de confirmar.',
    429: 'Demasiados intentos. Esperá un minuto antes de volver a intentar.',
};

function handleOrderError(cause: unknown): never {
    if (!(cause instanceof ApiError)) throw cause;
    const { status, code } = cause;

    if (cause.details.stage === 'csrf') {
        throw new OrderError('No pudimos preparar la compra. Revisá tu conexión y tu sesión e intentá de nuevo.',
            { outcome: 'rejected', status, code, cause });
    }

    const message = cause.details.kind === 'http' ? statusMessages[cause.details.status] : undefined;
    throw new OrderError(message ?? uncertainMessage, { outcome: message ? 'rejected' : 'uncertain', status, code, cause });
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
    const payload: CreateOrderInput = {
        restaurantId: input.restaurantId,
        deliveryComuna: input.deliveryComuna,
        items: input.items.map(({ productId, quantity }) => ({ productId, quantity })),
    };
    try {
        return parseOrder(await mutate('/orders', payload));
    } catch (cause) {
        handleOrderError(cause);
    }
}
