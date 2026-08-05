// Static, indicative potato price bands (KES per 90kg bag) by harvest month.
//
// DATA GAP: there is no market-price data source anywhere in this codebase
// (no KAMIS integration, no price history table). These bands are rough,
// hand-curated approximations of typical Kenyan potato price seasonality
// (prices soften when main-season harvests across the highlands peak around
// Jul-Sep and Jan-Feb, and firm up in the leaner months). They must always be
// surfaced to the farmer as "Low confidence / indicative only" — never as a
// firm forecast — until a real market-price integration exists.

export interface PriceBand {
  month: number; // 1-12
  minPricePerBag: number;
  maxPricePerBag: number;
  pressure: 'downward' | 'upward' | 'neutral';
  note: string;
}

export const POTATO_PRICE_BANDS_KES_PER_90KG_BAG: PriceBand[] = [
  { month: 1, minPricePerBag: 1600, maxPricePerBag: 2200, pressure: 'downward', note: 'Coincides with a secondary harvest peak in several highland counties.' },
  { month: 2, minPricePerBag: 1800, maxPricePerBag: 2400, pressure: 'neutral', note: 'Supply easing after the January peak.' },
  { month: 3, minPricePerBag: 2000, maxPricePerBag: 2600, pressure: 'upward', note: 'Lean period ahead of the long-rains harvest.' },
  { month: 4, minPricePerBag: 2200, maxPricePerBag: 2800, pressure: 'upward', note: 'Typically the leanest supply month of the year.' },
  { month: 5, minPricePerBag: 2000, maxPricePerBag: 2600, pressure: 'neutral', note: 'Early long-rains produce starting to reach markets.' },
  { month: 6, minPricePerBag: 1800, maxPricePerBag: 2400, pressure: 'downward', note: 'Long-rains harvest volumes increasing.' },
  { month: 7, minPricePerBag: 1600, maxPricePerBag: 2200, pressure: 'downward', note: 'Main-season harvest activity peaks across the Rift Valley highlands.' },
  { month: 8, minPricePerBag: 1500, maxPricePerBag: 2100, pressure: 'downward', note: 'Regional oversupply typically softens prices.' },
  { month: 9, minPricePerBag: 1700, maxPricePerBag: 2300, pressure: 'neutral', note: 'Supply normalizing after the main-season glut.' },
  { month: 10, minPricePerBag: 1800, maxPricePerBag: 2400, pressure: 'upward', note: 'Short-rains planting underway, supply tightening.' },
  { month: 11, minPricePerBag: 1900, maxPricePerBag: 2500, pressure: 'upward', note: 'Lean period ahead of the short-rains harvest.' },
  { month: 12, minPricePerBag: 1800, maxPricePerBag: 2400, pressure: 'neutral', note: 'Festive-season demand offsets rising supply.' },
];

export function getPriceBandForMonth(month1to12: number): PriceBand {
  const found = POTATO_PRICE_BANDS_KES_PER_90KG_BAG.find((m) => m.month === month1to12);
  return found || POTATO_PRICE_BANDS_KES_PER_90KG_BAG[0];
}
