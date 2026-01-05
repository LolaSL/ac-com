"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _expressAsyncHandler = _interopRequireDefault(require("express-async-handler"));

var _orderModel = _interopRequireDefault(require("../models/orderModel.js"));

var _userModel = _interopRequireDefault(require("../models/userModel.js"));

var _productModel = _interopRequireDefault(require("../models/productModel.js"));

var _utils = require("../utils.js");

var _serviceProviderModel = _interopRequireDefault(require("../models/serviceProviderModel.js"));

var _earningModel = _interopRequireDefault(require("../models/earningModel.js"));

var _projectModel = _interopRequireDefault(require("../models/projectModel.js"));

var _messageModel = _interopRequireDefault(require("../models/messageModel.js"));

var _notificationModel = _interopRequireDefault(require("../models/notificationModel.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var orderRouter = _express["default"].Router();

orderRouter.get('/', _utils.isAuth, _utils.isAdmin, (0, _expressAsyncHandler["default"])(function _callee(req, res) {
  var pageSize, page, _req$query, status, q, dateFrom, dateTo, sort, filter, parseDate, fromDate, toDate, queryText, userMatches, userIds, orClauses, numericCandidate, delta, sortMap, sortKey, orders, countOrders, pages;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          pageSize = 15;
          page = Number(req.query.page) || 1;
          _req$query = req.query, status = _req$query.status, q = _req$query.q, dateFrom = _req$query.dateFrom, dateTo = _req$query.dateTo, sort = _req$query.sort; // Build filter

          filter = {};
          if (status === 'paid') filter.isPaid = true;
          if (status === 'pending') filter.isPaid = false;
          if (status === 'delivered') filter.isDelivered = true;
          if (status === 'not-delivered') filter.isDelivered = false;

          if (dateFrom || dateTo) {
            parseDate = function parseDate(s) {
              if (!s || typeof s !== 'string') return null;
              var d = new Date(s);
              return Number.isNaN(d.getTime()) ? null : d;
            };

            fromDate = parseDate(dateFrom);
            toDate = parseDate(dateTo);

            if (fromDate || toDate) {
              filter.createdAt = {};

              if (fromDate) {
                fromDate.setHours(0, 0, 0, 0);
                filter.createdAt.$gte = fromDate;
              }

              if (toDate) {
                toDate.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = toDate;
              }
            }
          } // Text search on order id (string) or user name


          if (!(q && q.trim())) {
            _context.next = 21;
            break;
          }

          queryText = q.trim();
          _context.next = 13;
          return regeneratorRuntime.awrap(_userModel["default"].find({
            name: {
              $regex: queryText,
              $options: 'i'
            }
          }, {
            _id: 1
          }));

        case 13:
          userMatches = _context.sent;
          userIds = userMatches.map(function (u) {
            return u._id;
          });
          orClauses = [];

          if (userIds.length) {
            orClauses.push({
              user: {
                $in: userIds
              }
            });
          } // Match order id


          orClauses.push({
            $expr: {
              $regexMatch: {
                input: {
                  $toString: '$_id'
                },
                regex: queryText,
                options: 'i'
              }
            }
          }); // Match totalPrice (supports inputs like "$953.63" or "953.63")

          numericCandidate = parseFloat(queryText.replace(/[^0-9.]/g, ''));

          if (!Number.isNaN(numericCandidate)) {
            delta = 0.01;
            orClauses.push({
              totalPrice: {
                $gte: numericCandidate - delta,
                $lte: numericCandidate + delta
              }
            });
          }

          filter.$or = orClauses;

        case 21:
          // Sort
          sortMap = {
            'createdAt:asc': {
              createdAt: 1
            },
            'createdAt:desc': {
              createdAt: -1
            },
            'totalPrice:asc': {
              totalPrice: 1
            },
            'totalPrice:desc': {
              totalPrice: -1
            },
            'paidAt:asc': {
              paidAt: 1
            },
            'paidAt:desc': {
              paidAt: -1
            },
            'deliveredAt:asc': {
              deliveredAt: 1
            },
            'deliveredAt:desc': {
              deliveredAt: -1
            }
          };
          sortKey = sort && sortMap[sort] ? sortMap[sort] : {
            createdAt: -1
          };
          _context.next = 25;
          return regeneratorRuntime.awrap(_orderModel["default"].find(filter).sort(sortKey).populate('user', 'name').skip(pageSize * (page - 1)).limit(pageSize));

        case 25:
          orders = _context.sent;
          _context.next = 28;
          return regeneratorRuntime.awrap(_orderModel["default"].countDocuments(filter));

        case 28:
          countOrders = _context.sent;
          pages = Math.ceil(countOrders / pageSize);
          res.send({
            orders: orders,
            page: page,
            pages: pages
          });

        case 31:
        case "end":
          return _context.stop();
      }
    }
  });
}));
orderRouter.post('/', _utils.isAuth, (0, _expressAsyncHandler["default"])(function _callee2(req, res) {
  var orderItems, itemsPrice, shippingPrice, taxPrice, totalPrice, roundedTotalPrice, newOrder, order;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          if (!(!req.body.orderItems || req.body.orderItems.length === 0)) {
            _context2.next = 2;
            break;
          }

          return _context2.abrupt("return", res.status(400).send({
            message: 'Cart is empty!'
          }));

        case 2:
          orderItems = req.body.orderItems.map(function (item) {
            var discountedPrice = item.discountedPrice || (item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price);
            return _objectSpread({}, item, {
              product: item._id,
              price: discountedPrice
            });
          });
          itemsPrice = Number.isNaN(parseFloat(req.body.itemsPrice)) ? 0 : parseFloat(req.body.itemsPrice);
          shippingPrice = Number.isNaN(parseFloat(req.body.shippingPrice)) ? 10 : parseFloat(req.body.shippingPrice);
          taxPrice = Number.isNaN(parseFloat(req.body.taxPrice)) ? 0 : parseFloat(req.body.taxPrice);
          totalPrice = Number.isNaN(parseFloat(req.body.totalPrice)) ? itemsPrice + shippingPrice + taxPrice : parseFloat(req.body.totalPrice); // Round to 2 decimal places to avoid PayPal DECIMAL_PRECISION error

          roundedTotalPrice = Math.round(totalPrice * 100) / 100;

          if (!Number.isNaN(roundedTotalPrice)) {
            _context2.next = 10;
            break;
          }

          return _context2.abrupt("return", res.status(400).send({
            message: 'Calculation error with total price'
          }));

        case 10:
          console.log('Order Items:', req.body.orderItems);
          console.log('Parsed Prices:', {
            itemsPrice: itemsPrice,
            shippingPrice: shippingPrice,
            taxPrice: taxPrice,
            totalPrice: totalPrice,
            roundedTotalPrice: roundedTotalPrice
          });
          console.log('User referredBy:', req.user.referredBy);
          newOrder = new _orderModel["default"]({
            orderItems: orderItems,
            shippingAddress: req.body.shippingAddress,
            paymentMethod: req.body.paymentMethod,
            paymentResult: req.body.paymentResult,
            itemsPrice: itemsPrice,
            shippingPrice: shippingPrice,
            taxPrice: taxPrice,
            totalPrice: roundedTotalPrice,
            user: req.user._id,
            referredBy: req.user.referredBy
          });
          _context2.next = 16;
          return regeneratorRuntime.awrap(newOrder.save());

        case 16:
          order = _context2.sent;
          _context2.next = 19;
          return regeneratorRuntime.awrap(_notificationModel["default"].create({
            title: 'Order Confirmed',
            message: "Your order #".concat(order._id.toString().slice(-6), " has been placed successfully. Total: $").concat(roundedTotalPrice.toFixed(2)),
            type: 'info',
            recipientType: 'user',
            userId: req.user._id
          }));

        case 19:
          _context2.next = 21;
          return regeneratorRuntime.awrap(_notificationModel["default"].create({
            title: 'New Order Received',
            message: "New order #".concat(order._id.toString().slice(-6), " from ").concat(req.user.name, ". Total: $").concat(roundedTotalPrice.toFixed(2)),
            type: 'urgent',
            recipientType: 'admin'
          }));

        case 21:
          res.status(201).send({
            message: 'New Order Created',
            order: order
          });

        case 22:
        case "end":
          return _context2.stop();
      }
    }
  });
}));
orderRouter.get('/summary', _utils.isAuth, _utils.isAdmin, (0, _expressAsyncHandler["default"])(function _callee3(req, res) {
  var page, limit, skip, orders, users, dailyOrders, productCategories, productDiscount, serviceProviders, totalServiceProviders, totalProjects, totalMessages, totalMessagesCount, totalEarnings, totalNotifications;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          page = Number(req.query.page) || 1;
          limit = Number(req.query.limit) || 10;
          skip = (page - 1) * limit;
          _context3.next = 6;
          return regeneratorRuntime.awrap(_orderModel["default"].aggregate([{
            $group: {
              _id: null,
              numOrders: {
                $sum: 1
              },
              totalSales: {
                $sum: '$totalPrice'
              }
            }
          }]));

        case 6:
          orders = _context3.sent;
          _context3.next = 9;
          return regeneratorRuntime.awrap(_userModel["default"].aggregate([{
            $group: {
              _id: null,
              numUsers: {
                $sum: 1
              }
            }
          }]));

        case 9:
          users = _context3.sent;
          _context3.next = 12;
          return regeneratorRuntime.awrap(_orderModel["default"].aggregate([{
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              orders: {
                $sum: 1
              },
              sales: {
                $sum: '$totalPrice'
              },
              paidOrders: {
                $sum: {
                  $cond: [{
                    $eq: ['$isPaid', true]
                  }, 1, 0]
                }
              },
              notPaidOrders: {
                $sum: {
                  $cond: [{
                    $eq: ['$isPaid', false]
                  }, 1, 0]
                }
              },
              deliveredOrders: {
                $sum: {
                  $cond: [{
                    $eq: ['$isDelivered', true]
                  }, 1, 0]
                }
              },
              notDeliveredOrders: {
                $sum: {
                  $cond: [{
                    $eq: ['$isDelivered', false]
                  }, 1, 0]
                }
              }
            }
          }, {
            $sort: {
              _id: 1
            }
          }]));

        case 12:
          dailyOrders = _context3.sent;
          _context3.next = 15;
          return regeneratorRuntime.awrap(_productModel["default"].aggregate([{
            $group: {
              _id: '$category',
              count: {
                $sum: 1
              }
            }
          }]));

        case 15:
          productCategories = _context3.sent;
          _context3.next = 18;
          return regeneratorRuntime.awrap(_productModel["default"].aggregate([{
            $group: {
              _id: '$category',
              discount: {
                $sum: '$discount'
              }
            }
          }]));

        case 18:
          productDiscount = _context3.sent;
          _context3.next = 21;
          return regeneratorRuntime.awrap(_serviceProviderModel["default"].aggregate([{
            $skip: skip
          }, {
            $limit: limit
          }, {
            $group: {
              _id: null,
              numServiceProviders: {
                $sum: 1
              }
            }
          }]));

        case 21:
          serviceProviders = _context3.sent;
          _context3.next = 24;
          return regeneratorRuntime.awrap(_serviceProviderModel["default"].countDocuments());

        case 24:
          totalServiceProviders = _context3.sent;
          _context3.next = 27;
          return regeneratorRuntime.awrap(_projectModel["default"].aggregate([{
            $group: {
              _id: null,
              numProjects: {
                $sum: 1
              }
            }
          }]));

        case 27:
          totalProjects = _context3.sent;
          _context3.next = 30;
          return regeneratorRuntime.awrap(_messageModel["default"].aggregate([{
            $project: {
              _id: 1
            }
          }]));

        case 30:
          totalMessages = _context3.sent;
          console.log('Total messages found:', totalMessages.length);
          totalMessagesCount = totalMessages.length > 0 ? totalMessages.length : 0;
          _context3.next = 35;
          return regeneratorRuntime.awrap(_earningModel["default"].aggregate([{
            $group: {
              _id: null,
              totalEarnings: {
                $sum: '$amount'
              },
              numEarnings: {
                $sum: 1
              }
            }
          }]));

        case 35:
          totalEarnings = _context3.sent;
          _context3.next = 38;
          return regeneratorRuntime.awrap(_notificationModel["default"].aggregate([{
            $group: {
              _id: null,
              numNotifications: {
                $sum: 1
              }
            }
          }]));

        case 38:
          totalNotifications = _context3.sent;
          res.send({
            users: users,
            orders: orders,
            dailyOrders: dailyOrders,
            productCategories: productCategories,
            serviceProviders: serviceProviders,
            totalProjects: totalProjects,
            totalMessages: totalMessagesCount,
            totalEarnings: totalEarnings,
            totalServiceProviders: totalServiceProviders,
            currentPage: page,
            totalPages: Math.ceil(totalServiceProviders / limit),
            totalNotifications: totalNotifications,
            productDiscount: productDiscount
          });
          _context3.next = 46;
          break;

        case 42:
          _context3.prev = 42;
          _context3.t0 = _context3["catch"](0);
          console.error('Error fetching summary:', _context3.t0);
          res.status(500).send({
            message: 'Error fetching summary data'
          });

        case 46:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 42]]);
}));
orderRouter.get('/mine', _utils.isAuth, (0, _expressAsyncHandler["default"])(function _callee4(req, res) {
  var pageSize, page, countOrders, orders, pages;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          pageSize = 15;
          page = Number(req.query.page) || 1;
          _context4.next = 4;
          return regeneratorRuntime.awrap(_orderModel["default"].countDocuments({
            user: req.user._id
          }));

        case 4:
          countOrders = _context4.sent;
          _context4.next = 7;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            user: req.user._id
          }).sort({
            createdAt: -1
          }).skip(pageSize * (page - 1)).limit(pageSize));

        case 7:
          orders = _context4.sent;
          pages = Math.ceil(countOrders / pageSize);
          res.send({
            orders: orders,
            page: page,
            pages: pages
          });

        case 10:
        case "end":
          return _context4.stop();
      }
    }
  });
}));
orderRouter.get('/:id', _utils.isAuth, (0, _expressAsyncHandler["default"])(function _callee5(req, res) {
  var order;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return regeneratorRuntime.awrap(_orderModel["default"].findById(req.params.id));

        case 2:
          order = _context5.sent;

          if (order) {
            res.send(order);
          } else {
            res.status(404).send({
              message: 'Order Not Found'
            });
          }

        case 4:
        case "end":
          return _context5.stop();
      }
    }
  });
}));
orderRouter.post('/validate-cart', function _callee7(req, res) {
  var cartItems, validatedItems;
  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          cartItems = req.body.cartItems;
          _context7.prev = 1;
          _context7.next = 4;
          return regeneratorRuntime.awrap(Promise.all(cartItems.map(function _callee6(item) {
            var product;
            return regeneratorRuntime.async(function _callee6$(_context6) {
              while (1) {
                switch (_context6.prev = _context6.next) {
                  case 0:
                    _context6.next = 2;
                    return regeneratorRuntime.awrap(_productModel["default"].findById(item._id));

                  case 2:
                    product = _context6.sent;
                    return _context6.abrupt("return", _objectSpread({}, item, {
                      price: product.price
                    }));

                  case 4:
                  case "end":
                    return _context6.stop();
                }
              }
            });
          })));

        case 4:
          validatedItems = _context7.sent;
          res.json(validatedItems);
          _context7.next = 11;
          break;

        case 8:
          _context7.prev = 8;
          _context7.t0 = _context7["catch"](1);
          res.status(400).send({
            message: 'Invalid Cart Items',
            error: _context7.t0
          });

        case 11:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[1, 8]]);
});
orderRouter.put('/:id/deliver', _utils.isAuth, (0, _expressAsyncHandler["default"])(function _callee8(req, res) {
  var order, user;
  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return regeneratorRuntime.awrap(_orderModel["default"].findById(req.params.id));

        case 2:
          order = _context8.sent;

          if (!order) {
            _context8.next = 17;
            break;
          }

          order.isDelivered = true;
          order.deliveredAt = Date.now();
          _context8.next = 8;
          return regeneratorRuntime.awrap(order.save());

        case 8:
          _context8.next = 10;
          return regeneratorRuntime.awrap(_userModel["default"].findById(order.user));

        case 10:
          user = _context8.sent;

          if (!user) {
            _context8.next = 14;
            break;
          }

          _context8.next = 14;
          return regeneratorRuntime.awrap(_notificationModel["default"].create({
            title: 'Order Delivered',
            message: "Your order #".concat(order._id.toString().slice(-6), " has been delivered successfully!"),
            type: 'info',
            recipientType: 'user',
            userId: order.user
          }));

        case 14:
          res.send({
            message: 'Order Delivered'
          });
          _context8.next = 18;
          break;

        case 17:
          res.status(404).send({
            message: 'Order Not Found'
          });

        case 18:
        case "end":
          return _context8.stop();
      }
    }
  });
}));
orderRouter.put('/:id/pay', _utils.isAuth, (0, _expressAsyncHandler["default"])(function _callee9(req, res) {
  var order, updatedOrder;
  return regeneratorRuntime.async(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.next = 2;
          return regeneratorRuntime.awrap(_orderModel["default"].findById(req.params.id).populate('user', 'email name'));

        case 2:
          order = _context9.sent;

          if (!order) {
            _context9.next = 17;
            break;
          }

          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentResult = {
            id: req.body.id,
            status: req.body.status,
            update_time: req.body.update_time,
            email_address: req.body.email_address
          };
          _context9.next = 9;
          return regeneratorRuntime.awrap(order.save());

        case 9:
          updatedOrder = _context9.sent;
          _context9.next = 12;
          return regeneratorRuntime.awrap(_notificationModel["default"].create({
            title: 'Payment Confirmed',
            message: "Payment for order #".concat(order._id.toString().slice(-6), " has been processed successfully."),
            type: 'info',
            recipientType: 'user',
            userId: order.user._id
          }));

        case 12:
          _context9.next = 14;
          return regeneratorRuntime.awrap(_notificationModel["default"].create({
            title: 'Order Payment Received',
            message: "Payment received for order #".concat(order._id.toString().slice(-6), " from ").concat(order.user.name, "."),
            type: 'info',
            recipientType: 'admin'
          }));

        case 14:
          res.send({
            message: 'Order Paid',
            order: updatedOrder
          });
          _context9.next = 18;
          break;

        case 17:
          res.status(404).send({
            message: 'Order Not Found'
          });

        case 18:
        case "end":
          return _context9.stop();
      }
    }
  });
}));
orderRouter["delete"]('/:id', _utils.isAuth, _utils.isAdmin, (0, _expressAsyncHandler["default"])(function _callee10(req, res) {
  var order;
  return regeneratorRuntime.async(function _callee10$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.next = 2;
          return regeneratorRuntime.awrap(_orderModel["default"].findById(req.params.id));

        case 2:
          order = _context10.sent;

          if (!order) {
            _context10.next = 9;
            break;
          }

          _context10.next = 6;
          return regeneratorRuntime.awrap(order.deleteOne());

        case 6:
          res.send({
            message: 'Order Deleted'
          });
          _context10.next = 10;
          break;

        case 9:
          res.status(404).send({
            message: 'Order Not Found'
          });

        case 10:
        case "end":
          return _context10.stop();
      }
    }
  });
}));
var _default = orderRouter;
exports["default"] = _default;