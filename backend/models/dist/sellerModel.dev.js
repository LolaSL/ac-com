"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _mongoose = _interopRequireDefault(require("mongoose"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var reviewSchema = new _mongoose["default"].Schema({
  name: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  user: {
    type: _mongoose["default"].Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deleted: {
    type: Boolean,
    "default": false
  }
}, {
  timestamps: true
});
var sellerSchema = new _mongoose["default"].Schema({
  name: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  info: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  companyLink: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    "default": 0
  },
  numReviews: {
    type: Number,
    "default": 0
  },
  reviews: [reviewSchema],
  logo: {
    type: String,
    "default": ""
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

var Seller = _mongoose["default"].model('Seller', sellerSchema);

var _default = Seller;
exports["default"] = _default;