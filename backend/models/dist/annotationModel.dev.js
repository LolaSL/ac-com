"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _mongoose = _interopRequireWildcard(require("mongoose"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var annotationSchema = new _mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  pdfData: {
    type: Buffer,
    required: true
  },
  userId: {
    type: _mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  pdfId: {
    type: String,
    required: true
  },
  originalImageWidth: {
    type: Number,
    required: true
  },
  originalImageHeight: {
    type: Number,
    required: true
  },
  annotations: {
    rectangles: [{
      id: {
        type: String,
        required: true
      },
      xPercent: {
        type: Number,
        required: true
      },
      yPercent: {
        type: Number,
        required: true
      },
      widthPercent: {
        type: Number,
        required: true
      },
      heightPercent: {
        type: Number,
        required: true
      },
      fill: {
        type: String
      },
      stroke: {
        type: String
      },
      rotation: {
        type: Number,
        "default": 0
      }
    }],
    comments: [{
      id: {
        type: String,
        required: true
      },
      rectId: {
        type: String,
        required: true
      },
      text: {
        type: String,
        required: true
      },
      xPercent: {
        type: Number,
        required: true
      },
      yPercent: {
        type: Number,
        required: true
      },
      fill: {
        type: String
      },
      textColor: {
        type: String
      }
    }],
    lines: [{
      id: {
        type: String,
        required: true
      },
      rectId: {
        type: String,
        required: true
      },
      commentId: {
        type: String,
        required: true
      },
      points: [{
        type: Number
      }],
      stroke: {
        type: String
      },
      strokeWidth: {
        type: Number
      }
    }],
    hvac: {
      ducts: [{
        id: {
          type: String,
          required: true
        },
        xPercent: {
          type: Number,
          required: true
        },
        yPercent: {
          type: Number,
          required: true
        },
        width: {
          type: Number,
          required: true
        },
        height: {
          type: Number
        },
        fill: {
          type: String
        },
        stroke: {
          type: String
        }
      }],
      diffusers: [{
        id: {
          type: String,
          required: true
        },
        shape: {
          type: String,
          required: true
        },
        // "circle", "square"
        xPercent: {
          type: Number,
          required: true
        },
        yPercent: {
          type: Number,
          required: true
        },
        sizePercent: {
          type: Number,
          required: true
        },
        airflow: {
          type: Number
        } // optional CFM

      }]
    }
  },
  createdAt: {
    type: Date,
    "default": Date.now,
    expires: 60 * 60 * 24 * 7
  },
  updatedAt: {
    type: Date,
    "default": Date.now
  }
}, {
  timestamps: true
});

var AnnotationModel = _mongoose["default"].model("Annotation", annotationSchema);

var _default = AnnotationModel;
exports["default"] = _default;