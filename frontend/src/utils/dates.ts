const orderDateFormatter = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
});

export function formatOrderDate(date: string): string {
    return orderDateFormatter.format(new Date(`${date}T00:00:00Z`));
}
