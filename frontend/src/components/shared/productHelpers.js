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

// Helper: recommend minimum copper wire gauge (AWG) for a given circuit ampacity.
// Wire is sized to the MCA; smaller AWG numbers = thicker wire = higher amperage.
// Based on standard copper AWG requirements for AC condensers.
export const getCopperWireGauge = (amps) => {
  const a = Number(amps);
  if (!a || isNaN(a) || a <= 0) return null;
  if (a <= 15) return { awg: '14 AWG', application: 'Small PTAC units / window units' };
  if (a <= 20) return { awg: '12 AWG', application: 'Small central AC condensers (1.5–2 Tons)' };
  if (a <= 30) return { awg: '10 AWG', application: 'Standard central AC condensers (2.5–3.5 Tons)' };
  if (a <= 40) return { awg: '8 AWG', application: 'Large central AC condensers (4–5 Tons)' };
  if (a <= 50) return { awg: '6 AWG', application: 'Very large residential systems / heat pumps' };
  return { awg: '4 AWG or larger', application: 'Consult a licensed electrician for loads above 50A' };
};

// Helper: typical mini-split electrical needs by cooling capacity (BTU).
// Reference only — the nameplate MCA sizes the wire and MOCP caps the breaker.
export const getMiniSplitElectricalGuide = (btu) => {
  const b = Number(btu);
  if (!b || isNaN(b) || b <= 0) return null;
  if (b <= 9000) {
    return { capacity: '0.75 ton', voltage: '115V or 208–230V', runningAmps: '~3–4 A', mocp: '15 A', breaker: 'single-pole 15A', poles: 1 };
  }
  if (b <= 12000) {
    return { capacity: '1 ton', voltage: '115V or 208–230V', runningAmps: '~4–5 A', mocp: '15–20 A', breaker: 'single-pole 15–20A', poles: 1 };
  }
  if (b <= 18000) {
    return { capacity: '1.5 ton', voltage: '208–230V', runningAmps: '~6–8 A', mocp: '20 A', breaker: 'double-pole 20A', poles: 2 };
  }
  if (b <= 24000) {
    return { capacity: '2 ton', voltage: '208–230V', runningAmps: '~8–11 A', mocp: '25–30 A', breaker: 'double-pole 25–30A', poles: 2 };
  }
  return { capacity: '3 ton', voltage: '208–230V', runningAmps: '~11–16 A', mocp: '30–40 A', breaker: 'double-pole 30–40A', poles: 2 };
};

// Helper: Calculate product price with discount
export const calculateProductPrice = (product) => {
  if (!product.price) return '—';
  
  const price = product.discount
    ? (product.price - (product.price * product.discount) / 100).toFixed(2)
    : product.price.toFixed(2);
  
  return price;
};
