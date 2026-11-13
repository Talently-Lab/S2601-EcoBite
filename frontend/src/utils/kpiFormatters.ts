import { LOCALE } from '../constants/constants';

const GRAMS_PER_KG = 1000;

function createFormatter(options?: Intl.NumberFormatOptions): (value: number) => string {
    return new Intl.NumberFormat(LOCALE, options).format;
}

export const formatCount = createFormatter();
const gramFormatter = createFormatter({ maximumFractionDigits: 0 });
const kilogramFormatter = createFormatter({ minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatGrams = (grams: number): string => grams < GRAMS_PER_KG
    ? `${gramFormatter(grams)}g`
    : `${kilogramFormatter(grams / GRAMS_PER_KG)} kg`;
