// Central pricing rules for shipping and tax.
// Single source of truth so Store, CartPage, and PlaceOrderPage stay in sync.

export const TAX_RATE = 0.08; // 8%

// Ordered from lowest itemsPrice to highest.
// Each tier: if itemsPrice > `min`, shipping is `price` (unless a higher tier matches).
export const SHIPPING_TIERS = [
  { min: 0, price: 25 },
  { min: 500, price: 50 },
  { min: 2000, price: 100 },
  { min: 5000, price: 0 }, // free shipping
];

export const FREE_SHIPPING_THRESHOLD = 5000;

export const round2 = (num) =>
  Math.round(num * 100 + Number.EPSILON) / 100;

export const getShippingPrice = (itemsPrice) => {
  let price = SHIPPING_TIERS[0].price;
  for (const tier of SHIPPING_TIERS) {
    if (itemsPrice > tier.min) price = tier.price;
  }
  return round2(price);
};

export const getTaxPrice = (itemsPrice) => round2(itemsPrice * TAX_RATE);

// Returns info about the next shipping tier the customer can reach, or null if at top tier.
export const getNextShippingTier = (itemsPrice) => {
  const currentShipping = getShippingPrice(itemsPrice);
  const next = SHIPPING_TIERS.find(
    (t) => t.min > itemsPrice && t.price < currentShipping
  );
  if (!next) return null;
  return {
    threshold: next.min,
    price: next.price,
    amountNeeded: round2(next.min - itemsPrice),
    isFree: next.price === 0,
  };
};
