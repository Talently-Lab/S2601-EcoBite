export const COMUNAS = Array.from({ length: 15 }, (_, index) => index + 1);

export function isValidComuna(comuna: number): boolean {
    return COMUNAS.includes(comuna);
}
