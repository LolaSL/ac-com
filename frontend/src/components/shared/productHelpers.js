/**
 * Shared helper functions for product display
 */

// Helper: safely extract name
export const getName = (obj) =>
  obj?.name ||
  obj?.model ||
  obj?.productName ||
  obj?.type ||
  "—";

// Helper: safely extract price
export const getPrice = (obj) => {
  const price =
    obj?.price ??
    obj?.cost ??
    obj?.minPrice ??
    obj?.maxPrice ??
    obj?.estimatedCost;

  if (price === undefined || price === null) return "—";

  const num = Number(price);
  if (isNaN(num)) return "—";

  return `$${num.toLocaleString()}`;
};

// Helper: get category icon
export const getCategoryIcon = (category) => {
  const icons = {
    'Mini Split AC': '❄️',
    'Wall-Mounted AC': '🧊',
    'Cassette Indoor Unit': '🔲',
    'Wind-Free TM Cooling': '🌬️',
    'VRF Heat Recovery': '🔧',
    'Controller': '🎛️',
    'Fan Motor': '🔄',
    'Fans': '🌀',
    'Filters': '🫧',
    'Knobs': '🎚️',
    'Power Cords': '🔌',
    'Mounting': '🔩',
    'Refrigerant Piping': '🔄',
    'Drainage': '💧',
    'Electrical': '⚡',
    'Accessories': '🛠️',
    'Consumables': '🧰',
    'Spare Parts': '⚙️'
  };
  return icons[category] || '📦';
};

// Helper: Calculate product price with discount
export const calculateProductPrice = (product) => {
  if (!product.price) return '—';
  
  const price = product.discount
    ? (product.price - (product.price * product.discount) / 100).toFixed(2)
    : product.price.toFixed(2);
  
  return price;
};
