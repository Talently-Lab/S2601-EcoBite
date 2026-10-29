const orderDateFormatter = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
});

const orderTimestampFormatter = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
});

export function formatOrderDate(date: string): string {
    return orderDateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export function formatOrderTimestamp(timestamp: string): string {
    return orderTimestampFormatter.format(new Date(timestamp));
}
