"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _mongoose = _interopRequireDefault(require("mongoose"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var orderSchema = new _mongoose["default"].Schema({
  orderItems: [{
    slug: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    product: {
      type: _mongoose["default"].Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    discount: {
      type: Number,
      "default": 0
    }
  }],
  shippingAddress: {
    fullName: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    location: {
      lat: Number,
      lng: Number,
      address: String,
      name: String,
      vicinity: String,
      googleAddressId: String
    }
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String
  },
  itemsPrice: {
    type: Number,
    required: true
  },
  shippingPrice: {
    type: Number,
    required: true
  },
  taxPrice: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  user: {
    type: _mongoose["default"].Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPaid: {
    type: Boolean,
    "default": false
  },
  paidAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    "default": false
  },
  deliveredAt: {
    type: Date
  },
  referredBy: {
    type: _mongoose["default"].Schema.Types.ObjectId,
    ref: 'Seller'
  }
}, {
  timestamps: true
}); // Helpful indexes for common admin queries and sorting

orderSchema.index({
  createdAt: -1
});
orderSchema.index({
  user: 1,
  createdAt: -1
});

var Order = _mongoose["default"].model('Order', orderSchema);

var _default = Order;
exports["default"] = _default;