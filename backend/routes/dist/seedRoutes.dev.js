"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _productModel = _interopRequireDefault(require("../models/productModel.js"));

var _userModel = _interopRequireDefault(require("../models/userModel.js"));

var _sellerModel = _interopRequireDefault(require("../models/sellerModel.js"));

var _contactModel = _interopRequireDefault(require("../models/contactModel.js"));

var _serviceProviderModel = _interopRequireDefault(require("../models/serviceProviderModel.js"));

var _projectModel = _interopRequireDefault(require("../models/projectModel.js"));

var _messageModel = _interopRequireDefault(require("../models/messageModel.js"));

var _earningModel = _interopRequireDefault(require("../models/earningModel.js"));

var _blogModel = _interopRequireDefault(require("../models/blogModel.js"));

var _notificationModel = _interopRequireDefault(require("../models/notificationModel.js"));

var _annotationModel = _interopRequireDefault(require("../models/annotationModel.js"));

var _orderModel = _interopRequireDefault(require("../models/orderModel.js"));

var _paymentModel = _interopRequireDefault(require("../models/paymentModel.js"));

var _data = _interopRequireDefault(require("../data.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var seedRouter = _express["default"].Router();

seedRouter.get('/', function _callee(req, res) {
  var includeOrders, ordersMode, createdServiceProviders, serviceProviderIds, projectsWithIds, createdProjects, projectIds, messagesWithIds, createdMessages, earningsWithIds, createdEarnings, paymentsWithIds, createdPayments, createdProducts, createdUsers, createdSellers, createdContacts, existingOrders, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, order, createdBlogs, createdNotifications, createdOrders, existingCount, ordersWithIds, result, _ordersWithIds, payIds, createdDates, existingQuery, _existingOrders, existingPayIds, existingCreatedKeys, seen, uniqueOrders, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, ord, payId, createdKey, key, _result, annotationsWithIds, createdAnnotations;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          includeOrders = req.query.includeOrders === 'true';
          ordersMode = req.query.ordersMode || (includeOrders ? 'append' : 'skip');
          _context.next = 5;
          return regeneratorRuntime.awrap(_productModel["default"].deleteMany({}));

        case 5:
          _context.next = 7;
          return regeneratorRuntime.awrap(_sellerModel["default"].deleteMany({}));

        case 7:
          _context.next = 9;
          return regeneratorRuntime.awrap(_contactModel["default"].deleteMany({}));

        case 9:
          _context.next = 11;
          return regeneratorRuntime.awrap(_serviceProviderModel["default"].deleteMany({}));

        case 11:
          _context.next = 13;
          return regeneratorRuntime.awrap(_projectModel["default"].deleteMany({}));

        case 13:
          _context.next = 15;
          return regeneratorRuntime.awrap(_messageModel["default"].deleteMany({}));

        case 15:
          _context.next = 17;
          return regeneratorRuntime.awrap(_earningModel["default"].deleteMany({}));

        case 17:
          _context.next = 19;
          return regeneratorRuntime.awrap(_blogModel["default"].deleteMany({}));

        case 19:
          _context.next = 21;
          return regeneratorRuntime.awrap(_notificationModel["default"].deleteMany({}));

        case 21:
          _context.next = 23;
          return regeneratorRuntime.awrap(_annotationModel["default"].deleteMany({}));

        case 23:
          _context.next = 25;
          return regeneratorRuntime.awrap(_paymentModel["default"].deleteMany({}));

        case 25:
          _context.next = 27;
          return regeneratorRuntime.awrap(_serviceProviderModel["default"].insertMany(_data["default"].serviceProviders));

        case 27:
          createdServiceProviders = _context.sent;
          serviceProviderIds = createdServiceProviders.map(function (sp) {
            return sp._id.toString();
          }); // Seed Projects

          projectsWithIds = _data["default"].projects.map(function (project, index) {
            return _objectSpread({}, project, {
              serviceProvider: serviceProviderIds[index % serviceProviderIds.length]
            });
          });
          _context.next = 32;
          return regeneratorRuntime.awrap(_projectModel["default"].insertMany(projectsWithIds));

        case 32:
          createdProjects = _context.sent;
          projectIds = createdProjects.map(function (p) {
            return p._id.toString();
          }); // Seed Messages

          messagesWithIds = _data["default"].messages.map(function (message, index) {
            return _objectSpread({}, message, {
              serviceProvider: serviceProviderIds[index % serviceProviderIds.length]
            });
          });
          _context.next = 37;
          return regeneratorRuntime.awrap(_messageModel["default"].insertMany(messagesWithIds));

        case 37:
          createdMessages = _context.sent;
          // Seed Earnings
          earningsWithIds = _data["default"].earnings.map(function (earning, index) {
            return _objectSpread({}, earning, {
              serviceProvider: serviceProviderIds[index % serviceProviderIds.length],
              projectName: projectIds[index % projectIds.length]
            });
          });
          _context.next = 41;
          return regeneratorRuntime.awrap(_earningModel["default"].insertMany(earningsWithIds));

        case 41:
          createdEarnings = _context.sent;
          // Seed Payments
          paymentsWithIds = _data["default"].payments.map(function (payment, index) {
            return _objectSpread({}, payment, {
              serviceProvider: serviceProviderIds[index % serviceProviderIds.length]
            });
          });
          _context.next = 45;
          return regeneratorRuntime.awrap(_paymentModel["default"].insertMany(paymentsWithIds));

        case 45:
          createdPayments = _context.sent;
          _context.next = 48;
          return regeneratorRuntime.awrap(_productModel["default"].insertMany(_data["default"].products));

        case 48:
          createdProducts = _context.sent;
          _context.next = 51;
          return regeneratorRuntime.awrap(_userModel["default"].find({}));

        case 51:
          createdUsers = _context.sent;

          if (!(createdUsers.length === 0)) {
            _context.next = 56;
            break;
          }

          _context.next = 55;
          return regeneratorRuntime.awrap(_userModel["default"].insertMany(_data["default"].users));

        case 55:
          createdUsers = _context.sent;

        case 56:
          _context.next = 58;
          return regeneratorRuntime.awrap(_sellerModel["default"].insertMany(_data["default"].sellers));

        case 58:
          createdSellers = _context.sent;
          _context.next = 61;
          return regeneratorRuntime.awrap(_contactModel["default"].insertMany(_data["default"].contacts));

        case 61:
          createdContacts = _context.sent;

          if (!(createdUsers.length > 0 && createdSellers.length > 0)) {
            _context.next = 74;
            break;
          }

          _context.next = 65;
          return regeneratorRuntime.awrap(_userModel["default"].findByIdAndUpdate(createdUsers[0]._id, {
            referredBy: createdSellers[0]._id
          }));

        case 65:
          _context.next = 67;
          return regeneratorRuntime.awrap(_userModel["default"].findByIdAndUpdate(createdUsers[1]._id, {
            referredBy: createdSellers[0]._id
          }));

        case 67:
          _context.next = 69;
          return regeneratorRuntime.awrap(_userModel["default"].findByIdAndUpdate(createdUsers[2]._id, {
            referredBy: createdSellers[0]._id
          }));

        case 69:
          if (!(createdSellers.length > 1)) {
            _context.next = 74;
            break;
          }

          _context.next = 72;
          return regeneratorRuntime.awrap(_userModel["default"].findByIdAndUpdate(createdUsers[3]._id, {
            referredBy: createdSellers[1]._id
          }));

        case 72:
          _context.next = 74;
          return regeneratorRuntime.awrap(_userModel["default"].findByIdAndUpdate(createdUsers[4]._id, {
            referredBy: createdSellers[1]._id
          }));

        case 74:
          _context.next = 76;
          return regeneratorRuntime.awrap(_userModel["default"].find({}));

        case 76:
          createdUsers = _context.sent;
          _context.next = 79;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            referredBy: {
              $exists: false
            }
          }).populate('user'));

        case 79:
          existingOrders = _context.sent;
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context.prev = 83;
          _iterator = existingOrders[Symbol.iterator]();

        case 85:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context.next = 93;
            break;
          }

          order = _step.value;

          if (!(order.user && order.user.referredBy)) {
            _context.next = 90;
            break;
          }

          _context.next = 90;
          return regeneratorRuntime.awrap(_orderModel["default"].findByIdAndUpdate(order._id, {
            referredBy: order.user.referredBy
          }));

        case 90:
          _iteratorNormalCompletion = true;
          _context.next = 85;
          break;

        case 93:
          _context.next = 99;
          break;

        case 95:
          _context.prev = 95;
          _context.t0 = _context["catch"](83);
          _didIteratorError = true;
          _iteratorError = _context.t0;

        case 99:
          _context.prev = 99;
          _context.prev = 100;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 102:
          _context.prev = 102;

          if (!_didIteratorError) {
            _context.next = 105;
            break;
          }

          throw _iteratorError;

        case 105:
          return _context.finish(102);

        case 106:
          return _context.finish(99);

        case 107:
          _context.next = 109;
          return regeneratorRuntime.awrap(_blogModel["default"].insertMany(_data["default"].blogs));

        case 109:
          createdBlogs = _context.sent;
          _context.next = 112;
          return regeneratorRuntime.awrap(_notificationModel["default"].insertMany(_data["default"].notifications));

        case 112:
          createdNotifications = _context.sent;
          // Seed Orders with proper user and product references
          createdOrders = [];

          if (!(ordersMode === 'seedIfNone')) {
            _context.next = 129;
            break;
          }

          _context.next = 117;
          return regeneratorRuntime.awrap(_orderModel["default"].countDocuments());

        case 117:
          existingCount = _context.sent;

          if (!(existingCount === 0)) {
            _context.next = 126;
            break;
          }

          ordersWithIds = _data["default"].orders.map(function (order, index) {
            var userId = createdUsers[index % createdUsers.length]._id;
            var user = createdUsers[index % createdUsers.length];
            var orderItemsWithProductIds = order.orderItems.map(function (item) {
              var product = createdProducts.find(function (p) {
                return p.slug === item.slug;
              });
              return _objectSpread({}, item, {
                product: product ? product._id : createdProducts[0]._id
              });
            });
            return _objectSpread({}, order, {
              user: userId,
              orderItems: orderItemsWithProductIds,
              referredBy: user.referredBy || null
            });
          });
          _context.next = 122;
          return regeneratorRuntime.awrap(_orderModel["default"].collection.insertMany(ordersWithIds, {
            ordered: true
          }));

        case 122:
          result = _context.sent;
          createdOrders = Object.values(result.insertedIds);
          _context.next = 127;
          break;

        case 126:
          createdOrders = [];

        case 127:
          _context.next = 183;
          break;

        case 129:
          if (!(ordersMode === 'reset' || ordersMode === 'append')) {
            _context.next = 183;
            break;
          }

          // Always preserve manual orders, only add new seed orders that don't exist
          _ordersWithIds = _data["default"].orders.map(function (order, index) {
            var userId = createdUsers[index % createdUsers.length]._id;
            var user = createdUsers[index % createdUsers.length];
            var orderItemsWithProductIds = order.orderItems.map(function (item) {
              var product = createdProducts.find(function (p) {
                return p.slug === item.slug;
              });
              return _objectSpread({}, item, {
                product: product ? product._id : createdProducts[0]._id
              });
            });
            return _objectSpread({}, order, {
              user: userId,
              orderItems: orderItemsWithProductIds,
              referredBy: user.referredBy || null
            });
          }); // Deduplicate seed orders and avoid inserting orders that already exist in DB

          payIds = _ordersWithIds.map(function (o) {
            return o.paymentResult && o.paymentResult.id ? o.paymentResult.id : null;
          }).filter(Boolean);
          createdDates = _ordersWithIds.map(function (o) {
            return o.createdAt ? new Date(o.createdAt) : null;
          }).filter(Boolean);
          existingQuery = [];
          if (payIds.length) existingQuery.push({
            'paymentResult.id': {
              $in: payIds
            }
          });
          if (createdDates.length) existingQuery.push({
            createdAt: {
              $in: createdDates
            }
          });
          _existingOrders = [];

          if (!existingQuery.length) {
            _context.next = 141;
            break;
          }

          _context.next = 140;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            $or: existingQuery
          }));

        case 140:
          _existingOrders = _context.sent;

        case 141:
          existingPayIds = new Set(_existingOrders.map(function (o) {
            return o.paymentResult && o.paymentResult.id ? o.paymentResult.id : null;
          }).filter(Boolean));
          existingCreatedKeys = new Set(_existingOrders.map(function (o) {
            return o.createdAt ? new Date(o.createdAt).toISOString() : null;
          }).filter(Boolean));
          seen = new Set();
          uniqueOrders = [];
          _iteratorNormalCompletion2 = true;
          _didIteratorError2 = false;
          _iteratorError2 = undefined;
          _context.prev = 148;
          _iterator2 = _ordersWithIds[Symbol.iterator]();

        case 150:
          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
            _context.next = 161;
            break;
          }

          ord = _step2.value;
          payId = ord.paymentResult && ord.paymentResult.id ? ord.paymentResult.id : null;
          createdKey = ord.createdAt ? new Date(ord.createdAt).toISOString() : null;
          key = payId || createdKey || JSON.stringify({
            items: ord.orderItems.map(function (i) {
              return {
                slug: i.slug,
                qty: i.quantity
              };
            }),
            total: ord.totalPrice
          });

          if (!(existingPayIds.has(payId) || existingCreatedKeys.has(createdKey))) {
            _context.next = 157;
            break;
          }

          return _context.abrupt("continue", 158);

        case 157:
          if (!seen.has(key)) {
            seen.add(key);
            uniqueOrders.push(ord);
          }

        case 158:
          _iteratorNormalCompletion2 = true;
          _context.next = 150;
          break;

        case 161:
          _context.next = 167;
          break;

        case 163:
          _context.prev = 163;
          _context.t1 = _context["catch"](148);
          _didIteratorError2 = true;
          _iteratorError2 = _context.t1;

        case 167:
          _context.prev = 167;
          _context.prev = 168;

          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }

        case 170:
          _context.prev = 170;

          if (!_didIteratorError2) {
            _context.next = 173;
            break;
          }

          throw _iteratorError2;

        case 173:
          return _context.finish(170);

        case 174:
          return _context.finish(167);

        case 175:
          if (!uniqueOrders.length) {
            _context.next = 182;
            break;
          }

          _context.next = 178;
          return regeneratorRuntime.awrap(_orderModel["default"].collection.insertMany(uniqueOrders, {
            ordered: true
          }));

        case 178:
          _result = _context.sent;
          createdOrders = Object.values(_result.insertedIds);
          _context.next = 183;
          break;

        case 182:
          createdOrders = [];

        case 183:
          // Seed Annotations with required fields
          annotationsWithIds = _data["default"].annotations.map(function (annotation) {
            return _objectSpread({}, annotation, {
              userId: createdUsers[0]._id,
              pdfData: Buffer.from('%PDF-1.4\n% Dummy PDF content\n'),
              originalImageWidth: 800,
              originalImageHeight: 1000,
              isPaid: Math.random() < 0.5 // 50% chance to be true (paid) or false (free)

            });
          });
          _context.next = 186;
          return regeneratorRuntime.awrap(_annotationModel["default"].insertMany(annotationsWithIds));

        case 186:
          createdAnnotations = _context.sent;
          res.send({
            createdProducts: createdProducts,
            createdUsers: createdUsers,
            createdSellers: createdSellers,
            createdContacts: createdContacts,
            createdServiceProviders: createdServiceProviders,
            createdProjects: createdProjects,
            createdMessages: createdMessages,
            createdEarnings: createdEarnings,
            createdBlogs: createdBlogs,
            createdNotifications: createdNotifications,
            createdOrders: createdOrders,
            createdAnnotations: createdAnnotations,
            message: ordersMode === 'reset' ? 'Seeding completed (orders reset)' : ordersMode === 'append' ? 'Seeding completed (orders appended only if none existed)' : 'Seeding completed (orders preserved; to seed orders use ?includeOrders=true or ?ordersMode=reset)'
          });
          _context.next = 194;
          break;

        case 190:
          _context.prev = 190;
          _context.t2 = _context["catch"](0);
          console.error('Error seeding data:', _context.t2);
          res.status(500).send({
            message: 'Error seeding data',
            error: _context.t2.message
          });

        case 194:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 190], [83, 95, 99, 107], [100,, 102, 106], [148, 163, 167, 175], [168,, 170, 174]]);
});
var _default = seedRouter;
exports["default"] = _default;