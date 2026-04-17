import { createContext, useReducer } from 'react';

export const Store = createContext();

const initialState = {
  fullBox: false,

  adminInfo: localStorage.getItem('adminInfo')
    ? JSON.parse(localStorage.getItem('adminInfo'))
    : null,

  userInfo: localStorage.getItem('userInfo')
    ? JSON.parse(localStorage.getItem('userInfo'))
    : null,

  serviceProviderInfo: localStorage.getItem('serviceProviderInfo')
    ? JSON.parse(localStorage.getItem('serviceProviderInfo'))
    : null,

  cart: {
    shippingAddress: localStorage.getItem('shippingAddress')
      ? JSON.parse(localStorage.getItem('shippingAddress'))
      : { location: {} },

    paymentMethod: localStorage.getItem('paymentMethod')
      ? localStorage.getItem('paymentMethod')
      : '',

    cartItems: localStorage.getItem('cartItems')
      ? JSON.parse(localStorage.getItem('cartItems'))
      : [],
  },

  // ROI Calculator state
  roiData: {
    currentCalculation: null,
    savedCalculations: [],
    isLoading: false,
    error: null,
  },

  // Linked BTU Calculator data
  btuData: {
    currentProject: localStorage.getItem('btuCurrentProject')
      ? JSON.parse(localStorage.getItem('btuCurrentProject'))
      : null,
    products: localStorage.getItem('btuProducts')
      ? JSON.parse(localStorage.getItem('btuProducts'))
      : [],
  },

  // HVAC Zone Designer state
  hvacData: {
    zones: [],
    currentZone: null,
    loading: false,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FULLBOX_ON':
      return { ...state, fullBox: true };

    case 'SET_FULLBOX_OFF':
      return { ...state, fullBox: false };

    case 'CART_ADD_ITEM': {
      const newItem = action.payload;
      const existItem = state.cart.cartItems.find(
        (item) => item._id === newItem._id
      );
      const cartItems = existItem
        ? state.cart.cartItems.map((item) =>
          item._id === existItem._id ? newItem : item
        )
        : [...state.cart.cartItems, newItem];

      localStorage.setItem('cartItems', JSON.stringify(cartItems));

      return { ...state, cart: { ...state.cart, cartItems } };
    }

    case 'CART_REMOVE_ITEM': {
      const cartItems = state.cart.cartItems.filter(
        (item) => item._id !== action.payload._id
      );

      localStorage.setItem('cartItems', JSON.stringify(cartItems));

      return { ...state, cart: { ...state.cart, cartItems } };
    }

    case 'CART_UPDATE_PRICES': {
      const itemsPrice = state.cart.cartItems.reduce(
        (acc, item) =>
          acc +
          (item.discount > 0
            ? item.quantity * item.price * (1 - item.discount / 100)
            : item.quantity * item.price),
        0
      );

      const taxPrice = itemsPrice * 0.1;
      const shippingPrice = itemsPrice > 100 ? 0 : 10;
      const totalPrice = itemsPrice + taxPrice + shippingPrice;

      // Round to 2 decimal places to avoid precision issues
      const roundedItemsPrice = Math.round(itemsPrice * 100) / 100;
      const roundedTaxPrice = Math.round(taxPrice * 100) / 100;
      const roundedShippingPrice = Math.round(shippingPrice * 100) / 100;
      const roundedTotalPrice = Math.round(totalPrice * 100) / 100;

      return {
        ...state,
        cart: {
          ...state.cart,
          itemsPrice: roundedItemsPrice.toFixed(2),
          taxPrice: roundedTaxPrice.toFixed(2),
          shippingPrice: roundedShippingPrice.toFixed(2),
          totalPrice: roundedTotalPrice.toFixed(2),
        },
      };
    }

    case 'CART_CLEAR':
      return { ...state, cart: { ...state.cart, cartItems: [] } };

    case 'SERVICE_PROVIDER_REGISTER':
    case 'SERVICE_PROVIDER_LOGIN':
      // Clear other user types when service provider logs in
      localStorage.removeItem('userInfo');
      localStorage.removeItem('adminInfo');
      localStorage.setItem(
        'serviceProviderInfo',
        JSON.stringify(action.payload)
      );
      return {
        ...state,
        serviceProviderInfo: action.payload,
        userInfo: null,
        adminInfo: null
      };

    case 'SERVICE_PROVIDER_SIGNOUT':
      localStorage.removeItem('serviceProviderInfo');
      return {
        ...state,
        serviceProviderInfo: null,
      };

    case 'ADMIN_LOGIN':
      // Clear other user types when admin logs in
      localStorage.removeItem('userInfo');
      localStorage.removeItem('serviceProviderInfo');
      localStorage.setItem('adminInfo', JSON.stringify(action.payload));
      return {
        ...state,
        adminInfo: action.payload,
        userInfo: null,
        serviceProviderInfo: null
      };

    case 'ADMIN_LOGOUT':
      localStorage.removeItem('adminInfo');
      return { ...state, adminInfo: null };

    case 'USER_SIGNIN':
      // Clear other user types when user logs in
      localStorage.removeItem('adminInfo');
      localStorage.removeItem('serviceProviderInfo');
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
      return {
        ...state,
        userInfo: action.payload,
        adminInfo: null,
        serviceProviderInfo: null
      };

    case 'USER_SIGNOUT':
      localStorage.removeItem('userInfo');
      localStorage.removeItem('cartItems');
      localStorage.removeItem('shippingAddress');
      localStorage.removeItem('paymentMethod');
      return {
        ...state,
        userInfo: null,
        cart: {
          cartItems: [],
          shippingAddress: {},
          paymentMethod: '',
        },
      };

    case 'SAVE_SHIPPING_ADDRESS':
      return {
        ...state,
        cart: {
          ...state.cart,
          shippingAddress: action.payload,
        },
      };

    case 'SAVE_SHIPPING_ADDRESS_MAP_LOCATION':
      return {
        ...state,
        cart: {
          ...state.cart,
          shippingAddress: {
            ...state.cart.shippingAddress,
            location: action.payload,
          },
        },
      };

    case 'SAVE_PAYMENT_METHOD':
      return {
        ...state,
        cart: { ...state.cart, paymentMethod: action.payload },
      };

    // ROI Calculator Actions
    case 'ROI_SET_LOADING':
      return {
        ...state,
        roiData: { ...state.roiData, isLoading: action.payload },
      };

    case 'ROI_SET_ERROR':
      return {
        ...state,
        roiData: { ...state.roiData, error: action.payload },
      };

    case 'ROI_SET_CURRENT_CALCULATION':
      return {
        ...state,
        roiData: { ...state.roiData, currentCalculation: action.payload, error: null },
      };

    case 'ROI_SET_SAVED_CALCULATIONS':
      return {
        ...state,
        roiData: { ...state.roiData, savedCalculations: action.payload, error: null },
      };

    case 'ROI_ADD_CALCULATION':
      return {
        ...state,
        roiData: {
          ...state.roiData,
          savedCalculations: [action.payload, ...state.roiData.savedCalculations],
        },
      };

    case 'ROI_UPDATE_CALCULATION':
      return {
        ...state,
        roiData: {
          ...state.roiData,
          savedCalculations: state.roiData.savedCalculations.map((calc) =>
            calc._id === action.payload._id ? action.payload : calc
          ),
        },
      };

    case 'ROI_DELETE_CALCULATION':
      return {
        ...state,
        roiData: {
          ...state.roiData,
          savedCalculations: state.roiData.savedCalculations.filter(
            (calc) => calc._id !== action.payload
          ),
        },
      };

    case 'ROI_CLEAR':
      return {
        ...state,
        roiData: {
          currentCalculation: null,
          savedCalculations: [],
          isLoading: false,
          error: null,
        },
      };

    // BTU Data Actions (for linking)
    case 'BTU_SET_CURRENT_PROJECT':
      localStorage.setItem(
        'btuCurrentProject',
        JSON.stringify(action.payload)
      );
      return {
        ...state,
        btuData: { ...state.btuData, currentProject: action.payload },
      };

    case 'BTU_SET_PRODUCTS':
      localStorage.setItem('btuProducts', JSON.stringify(action.payload));
      return {
        ...state,
        btuData: { ...state.btuData, products: action.payload },
      };

    case 'BTU_CLEAR':
      localStorage.removeItem('btuCurrentProject');
      localStorage.removeItem('btuProducts');
      return {
        ...state,
        btuData: {
          currentProject: null,
          products: [],
        },
      };

    // HVAC Zone Actions
    case 'HVAC_SET_LOADING':
      return {
        ...state,
        hvacData: {
          ...state.hvacData,
          loading: action.payload,
        },
      };

    case 'HVAC_SET_ZONES':
      return {
        ...state,
        hvacData: {
          ...state.hvacData,
          zones: action.payload,
        },
      };

    case 'HVAC_ADD_ZONE':
      return {
        ...state,
        hvacData: {
          ...state.hvacData,
          zones: [...state.hvacData.zones, action.payload],
        },
      };

    case 'HVAC_UPDATE_ZONE':
      return {
        ...state,
        hvacData: {
          ...state.hvacData,
          zones: state.hvacData.zones.map((zone) =>
            zone._id === action.payload._id ? action.payload : zone
          ),
        },
      };

    case 'HVAC_DELETE_ZONE':
      return {
        ...state,
        hvacData: {
          ...state.hvacData,
          zones: state.hvacData.zones.filter((zone) => zone._id !== action.payload),
        },
      };

    case 'HVAC_SET_CURRENT_ZONE':
      return {
        ...state,
        hvacData: {
          ...state.hvacData,
          currentZone: action.payload,
        },
      };

    default:
      return state;
  }
}

export function StoreProvider(props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = { state, dispatch };
  return <Store.Provider value={value}>{props.children}</Store.Provider>;
}
