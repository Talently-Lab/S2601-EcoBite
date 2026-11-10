import { DeliveryMethod } from '@prisma/client';
import { co2FromKilograms } from '../common/co2';
import { roundCo2Grams } from '../common/order-co2';
import { calculateHistoricalBikeCo2 } from './historical-bike-co2';

export function calculateHistoricalOrderCo2(
  deliveryMethod: DeliveryMethod,
  originalDistanceKm: string,
  csvCo2Kg: string,
): number {
  if (deliveryMethod === DeliveryMethod.BIKE) {
    return calculateHistoricalBikeCo2(originalDistanceKm.trim());
  }

  return roundCo2Grams(co2FromKilograms(csvCo2Kg.trim()));
}
