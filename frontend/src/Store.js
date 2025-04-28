import { createContext, useReducer } from 'react';

export const Store = createContext();

const initialState = {
  fullBox: false,

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

};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FULLBOX_ON':
      return { ...state, fullBox: true };
    case 'SET_FULLBOX_OFF':
      return { ...state, fullBox: false };
      case "CART_ADD_ITEM": {
        const newItem = action.payload;
        const existItem = state.cart.cartItems.find(
          (item) => item._id === newItem._id
        );
        const cartItems = existItem
          ? state.cart.cartItems.map((item) =>
              item._id === existItem._id ? newItem : item
            )
          : [...state.cart.cartItems, newItem];
      
        localStorage.setItem("cartItems", JSON.stringify(cartItems));
      
        return { ...state, cart: { ...state.cart, cartItems } };
      }
      
      case "CART_REMOVE_ITEM": {
        const cartItems = state.cart.cartItems.filter(
          (item) => item._id !== action.payload._id
        );
      
        localStorage.setItem("cartItems", JSON.stringify(cartItems));
      
        return { ...state, cart: { ...state.cart, cartItems } };
      }
      
      case "CART_UPDATE_PRICES": {
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
  
        return {
          ...state,
          cart: {
            ...state.cart,
            itemsPrice: itemsPrice.toFixed(2),
            taxPrice: taxPrice.toFixed(2),
            shippingPrice: shippingPrice.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
          },
        };
      }
  
    case 'CART_CLEAR':
      return { ...state, cart: { ...state.cart, cartItems: [] } };

    case 'SERVICE_PROVIDER_REGISTER':
      localStorage.setItem('serviceProviderInfo', JSON.stringify(action.payload));
      return { ...state, serviceProviderInfo: action.payload };

    case 'SERVICE_PROVIDER_LOGIN':
      localStorage.setItem('serviceProviderInfo', JSON.stringify(action.payload));
      return { ...state, serviceProviderInfo: action.payload };

    case 'USER_SIGNIN':
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
      return { ...state, userInfo: action.payload };

    case 'USER_SIGNOUT':
      localStorage.removeItem('userInfo');
      localStorage.removeItem('serviceProviderInfo');
      localStorage.removeItem('cartItems');
      localStorage.removeItem('shippingAddress');
      localStorage.removeItem('paymentMethod');
      return {
        ...state,
        userInfo: null,
        serviceProviderInfo: null,
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

    default:
      return state;
  }
}

export function StoreProvider(props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = { state, dispatch };
  return <Store.Provider value={value}>{props.children}</Store.Provider>;
}
