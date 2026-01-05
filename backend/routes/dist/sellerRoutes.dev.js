"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _expressAsyncHandler = _interopRequireDefault(require("express-async-handler"));

var _sellerModel = _interopRequireDefault(require("../models/sellerModel.js"));

var _orderModel = _interopRequireDefault(require("../models/orderModel.js"));

var _userModel = _interopRequireDefault(require("../models/userModel.js"));

var _utils = require("../utils.js");

var _multer = _interopRequireDefault(require("multer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var upload = (0, _multer["default"])();

var sellerRouter = _express["default"].Router();

sellerRouter.get('/all', (0, _expressAsyncHandler["default"])(function _callee(req, res) {
  var sellers;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(_sellerModel["default"].find({}));

        case 3:
          sellers = _context.sent;
          res.json(sellers);
          _context.next = 10;
          break;

        case 7:
          _context.prev = 7;
          _context.t0 = _context["catch"](0);
          res.status(500).json({
            message: _context.t0.message
          });

        case 10:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 7]]);
}));
sellerRouter.get("/", (0, _expressAsyncHandler["default"])(function _callee2(req, res) {
  var page, limit, skip, sellers, count, totalPages;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          page = Number(req.query.page) || 1;
          limit = Number(req.query.limit) || 10;
          skip = (page - 1) * limit;
          _context2.next = 6;
          return regeneratorRuntime.awrap(_sellerModel["default"].find().skip(skip).limit(limit));

        case 6:
          sellers = _context2.sent;
          _context2.next = 9;
          return regeneratorRuntime.awrap(_sellerModel["default"].countDocuments());

        case 9:
          count = _context2.sent;
          totalPages = Math.ceil(count / limit);
          res.json({
            page: page,
            totalPages: totalPages,
            sellers: sellers
          });
          _context2.next = 17;
          break;

        case 14:
          _context2.prev = 14;
          _context2.t0 = _context2["catch"](0);
          res.status(500).json({
            message: _context2.t0.message
          });

        case 17:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 14]]);
}));
sellerRouter.get('/', (0, _expressAsyncHandler["default"])(function _callee3(req, res) {
  var page, limit, skip, sellers, count, totalPages;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          page = Number(req.query.page) || 1;
          limit = Number(req.query.limit) || 10;
          skip = (page - 1) * limit;
          _context3.next = 5;
          return regeneratorRuntime.awrap(_sellerModel["default"].find().skip(skip).limit(limit));

        case 5:
          sellers = _context3.sent;
          _context3.next = 8;
          return regeneratorRuntime.awrap(_sellerModel["default"].countDocuments());

        case 8:
          count = _context3.sent;
          totalPages = Math.ceil(count / limit);
          res.json({
            page: page,
            totalPages: totalPages,
            sellers: sellers
          });

        case 11:
        case "end":
          return _context3.stop();
      }
    }
  });
}));
sellerRouter.get('/:id/referral-link', (0, _expressAsyncHandler["default"])(function _callee4(req, res) {
  var seller, link;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(_sellerModel["default"].findById(req.params.id));

        case 2:
          seller = _context4.sent;

          if (seller) {
            _context4.next = 5;
            break;
          }

          return _context4.abrupt("return", res.status(404).send({
            message: 'Seller not found'
          }));

        case 5:
          link = "".concat(process.env.FRONTEND_URL || 'http://localhost:3000', "/products?ref=").concat(seller.referralCode);
          res.send({
            referralLink: link
          });

        case 7:
        case "end":
          return _context4.stop();
      }
    }
  });
}));
sellerRouter.post('/', _utils.isAuth, _utils.isAdmin, upload.single('logo'), (0, _expressAsyncHandler["default"])(function _callee5(req, res) {
  var _req$body, name, brand, info, link, companyLink, logo, newSeller, savedSeller;

  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _req$body = req.body, name = _req$body.name, brand = _req$body.brand, info = _req$body.info, link = _req$body.link, companyLink = _req$body.companyLink;
          logo = req.file ? "/uploads/".concat(req.file.filename) : '';

          if (!(!name || !brand || !info || !link || !companyLink)) {
            _context5.next = 4;
            break;
          }

          return _context5.abrupt("return", res.status(400).json({
            message: 'All fields (name, brand, info, link, companyLink) are required!'
          }));

        case 4:
          newSeller = new _sellerModel["default"]({
            name: name,
            brand: brand,
            info: info,
            link: link,
            companyLink: companyLink,
            logo: logo
          });
          _context5.next = 7;
          return regeneratorRuntime.awrap(newSeller.save());

        case 7:
          savedSeller = _context5.sent;
          res.status(201).send({
            message: 'Seller created successfully',
            seller: savedSeller
          });

        case 9:
        case "end":
          return _context5.stop();
      }
    }
  });
}));
sellerRouter.put('/:id', _utils.isAuth, _utils.isAdmin, upload.single('logo'), (0, _expressAsyncHandler["default"])(function _callee6(req, res) {
  var seller, _req$body2, name, brand, info, link, companyLink, updatedSeller;

  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return regeneratorRuntime.awrap(_sellerModel["default"].findById(req.params.id));

        case 2:
          seller = _context6.sent;

          if (seller) {
            _context6.next = 5;
            break;
          }

          return _context6.abrupt("return", res.status(404).send({
            message: 'Seller Not Found'
          }));

        case 5:
          _req$body2 = req.body, name = _req$body2.name, brand = _req$body2.brand, info = _req$body2.info, link = _req$body2.link, companyLink = _req$body2.companyLink;
          seller.name = name || seller.name;
          seller.brand = brand || seller.brand;
          seller.info = info || seller.info;
          seller.link = link || seller.link;
          seller.companyLink = companyLink || seller.companyLink;

          if (req.file) {
            seller.logo = "/uploads/".concat(req.file.filename);
          }

          _context6.prev = 12;
          _context6.next = 15;
          return regeneratorRuntime.awrap(seller.save());

        case 15:
          updatedSeller = _context6.sent;
          res.send({
            message: 'Seller Updated',
            seller: updatedSeller
          });
          _context6.next = 22;
          break;

        case 19:
          _context6.prev = 19;
          _context6.t0 = _context6["catch"](12);
          res.status(400).send({
            message: 'Invalid Seller Data',
            error: _context6.t0.message
          });

        case 22:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[12, 19]]);
}));
sellerRouter.get("/all-referral-stats", (0, _expressAsyncHandler["default"])(function _callee7(req, res) {
  var sellers, allStats, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, seller, referredUsers, referredUserIds, referredOrders, totalReferredOrders, totalReferredSales, commissionRate, totalCommission;

  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          _context7.next = 3;
          return regeneratorRuntime.awrap(_sellerModel["default"].find({}));

        case 3:
          sellers = _context7.sent;
          allStats = [];
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context7.prev = 8;
          _iterator = sellers[Symbol.iterator]();

        case 10:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context7.next = 27;
            break;
          }

          seller = _step.value;
          _context7.next = 14;
          return regeneratorRuntime.awrap(_userModel["default"].find({
            referredBy: seller._id
          }).select("_id"));

        case 14:
          referredUsers = _context7.sent;
          referredUserIds = referredUsers.map(function (u) {
            return u._id;
          }); // 2️⃣ Orders placed by referred users

          _context7.next = 18;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            user: {
              $in: referredUserIds
            }
          }));

        case 18:
          referredOrders = _context7.sent;
          totalReferredOrders = referredOrders.length; // 3️⃣ Total sales & commission

          totalReferredSales = referredOrders.reduce(function (sum, order) {
            return sum + Number(order.totalPrice || 0);
          }, 0);
          commissionRate = 0.1; // 10%

          totalCommission = totalReferredSales * commissionRate;
          allStats.push({
            seller: {
              _id: seller._id,
              name: seller.name,
              brand: seller.brand,
              logo: seller.logo,
              referralCode: seller.referralCode
            },
            stats: {
              referredUsersCount: referredUsers.length,
              totalReferredOrders: totalReferredOrders,
              totalReferredSales: Number(totalReferredSales.toFixed(2)),
              totalCommission: Number(totalCommission.toFixed(2)),
              commissionRate: commissionRate
            }
          });

        case 24:
          _iteratorNormalCompletion = true;
          _context7.next = 10;
          break;

        case 27:
          _context7.next = 33;
          break;

        case 29:
          _context7.prev = 29;
          _context7.t0 = _context7["catch"](8);
          _didIteratorError = true;
          _iteratorError = _context7.t0;

        case 33:
          _context7.prev = 33;
          _context7.prev = 34;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 36:
          _context7.prev = 36;

          if (!_didIteratorError) {
            _context7.next = 39;
            break;
          }

          throw _iteratorError;

        case 39:
          return _context7.finish(36);

        case 40:
          return _context7.finish(33);

        case 41:
          res.json({
            totalSellers: sellers.length,
            sellers: allStats
          });
          _context7.next = 48;
          break;

        case 44:
          _context7.prev = 44;
          _context7.t1 = _context7["catch"](0);
          console.error("Error in /all-referral-stats:", _context7.t1);
          res.status(500).json({
            message: _context7.t1.message
          });

        case 48:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 44], [8, 29, 33, 41], [34,, 36, 40]]);
}));
sellerRouter.get('/:id/dashboard', (0, _expressAsyncHandler["default"])(function _callee8(req, res) {
  var sellerId, seller, referredUsers, referredUserIds, referredOrdersByUser, referredOrdersByPayment, referredOrdersMap, referredOrders, totalReferredUsers, totalReferredOrders, totalReferredSales, commissionRate, totalCommission;
  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          sellerId = req.params.id;
          _context8.next = 3;
          return regeneratorRuntime.awrap(_sellerModel["default"].findById(sellerId));

        case 3:
          seller = _context8.sent;

          if (seller) {
            _context8.next = 6;
            break;
          }

          return _context8.abrupt("return", res.status(404).json({
            message: 'Seller Not Found'
          }));

        case 6:
          _context8.next = 8;
          return regeneratorRuntime.awrap(_userModel["default"].find({
            referredBy: sellerId
          }).select('name email createdAt').sort({
            createdAt: -1
          }));

        case 8:
          referredUsers = _context8.sent;
          referredUserIds = referredUsers.map(function (u) {
            return u._id;
          }); // Referred orders: by referred users OR paymentResult.referredBy == sellerId

          _context8.next = 12;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            user: {
              $in: referredUserIds
            }
          }).populate('user', 'name email').sort({
            createdAt: -1
          }));

        case 12:
          referredOrdersByUser = _context8.sent;
          _context8.next = 15;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            'paymentResult.referredBy': sellerId
          }).populate('user', 'name email').sort({
            createdAt: -1
          }));

        case 15:
          referredOrdersByPayment = _context8.sent;
          // Combine and deduplicate orders
          referredOrdersMap = new Map();
          referredOrdersByUser.forEach(function (order) {
            return referredOrdersMap.set(order._id.toString(), order);
          });
          referredOrdersByPayment.forEach(function (order) {
            return referredOrdersMap.set(order._id.toString(), order);
          });
          referredOrders = Array.from(referredOrdersMap.values());
          totalReferredUsers = referredUsers.length;
          totalReferredOrders = referredOrders.length;
          totalReferredSales = referredOrders.reduce(function (sum, o) {
            return sum + Number(o.totalPrice || 0);
          }, 0);
          commissionRate = 0.1;
          totalCommission = totalReferredSales * commissionRate;
          res.json({
            seller: {
              _id: seller._id,
              name: seller.name,
              brand: seller.brand,
              logo: seller.logo,
              referralCode: seller.referralCode
            },
            stats: {
              referredUsersCount: totalReferredUsers,
              totalReferredOrders: totalReferredOrders,
              totalReferredSales: totalReferredSales,
              totalCommission: totalCommission,
              commissionRate: commissionRate
            },
            referredUsers: referredUsers,
            referredOrders: referredOrders
          });

        case 26:
        case "end":
          return _context8.stop();
      }
    }
  });
}));
sellerRouter.get('/:id', (0, _expressAsyncHandler["default"])(function _callee9(req, res) {
  var seller, referredUsers, referredUserIds, referredOrders, totalReferredOrders, totalReferredSales, commissionRate, totalCommission;
  return regeneratorRuntime.async(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.next = 2;
          return regeneratorRuntime.awrap(_sellerModel["default"].findById(req.params.id));

        case 2:
          seller = _context9.sent;

          if (seller) {
            _context9.next = 5;
            break;
          }

          return _context9.abrupt("return", res.status(404).send({
            message: 'Seller Not Found'
          }));

        case 5:
          _context9.next = 7;
          return regeneratorRuntime.awrap(_userModel["default"].find({
            referredBy: seller._id
          }).select('_id'));

        case 7:
          referredUsers = _context9.sent;
          referredUserIds = referredUsers.map(function (u) {
            return u._id;
          }); // Orders placed by referred users

          _context9.next = 11;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            user: {
              $in: referredUserIds
            }
          }));

        case 11:
          referredOrders = _context9.sent;
          totalReferredOrders = referredOrders.length;
          totalReferredSales = referredOrders.reduce(function (sum, order) {
            return sum + Number(order.totalPrice || 0);
          }, 0);
          commissionRate = 0.1;
          totalCommission = totalReferredSales * commissionRate;
          res.send({
            seller: {
              _id: seller._id,
              name: seller.name,
              brand: seller.brand,
              logo: seller.logo,
              referralCode: seller.referralCode
            },
            stats: {
              referredUsersCount: referredUsers.length,
              totalReferredOrders: totalReferredOrders,
              totalReferredSales: Number(totalReferredSales.toFixed(2)),
              totalCommission: Number(totalCommission.toFixed(2)),
              commissionRate: commissionRate
            },
            referredOrders: referredOrders // optional: for table rendering

          });

        case 17:
        case "end":
          return _context9.stop();
      }
    }
  });
}));
sellerRouter.post('/:id/reviews', _utils.isAuth, (0, _expressAsyncHandler["default"])(function _callee10(req, res) {
  var seller, review, updatedSeller;
  return regeneratorRuntime.async(function _callee10$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.next = 2;
          return regeneratorRuntime.awrap(_sellerModel["default"].findById(req.params.id));

        case 2:
          seller = _context10.sent;

          if (!seller) {
            _context10.next = 16;
            break;
          }

          if (!seller.reviews.find(function (x) {
            return x.user.toString() === req.user._id.toString();
          })) {
            _context10.next = 6;
            break;
          }

          return _context10.abrupt("return", res.status(400).send({
            message: 'You already submitted a review'
          }));

        case 6:
          review = {
            name: req.user.name,
            rating: Number(req.body.rating),
            comment: req.body.comment,
            user: req.user._id
          };
          seller.reviews.push(review);
          seller.numReviews = seller.reviews.length;
          seller.rating = seller.reviews.reduce(function (a, c) {
            return c.rating + a;
          }, 0) / seller.reviews.length;
          _context10.next = 12;
          return regeneratorRuntime.awrap(seller.save());

        case 12:
          updatedSeller = _context10.sent;
          res.status(201).send({
            message: 'Review Added',
            review: updatedSeller.reviews[updatedSeller.reviews.length - 1],
            numReviews: updatedSeller.numReviews,
            rating: updatedSeller.rating
          });
          _context10.next = 17;
          break;

        case 16:
          res.status(404).send({
            message: 'Seller Not Found'
          });

        case 17:
        case "end":
          return _context10.stop();
      }
    }
  });
}));
sellerRouter["delete"]('/:id', _utils.isAuth, _utils.isAdmin, (0, _expressAsyncHandler["default"])(function _callee11(req, res) {
  var seller;
  return regeneratorRuntime.async(function _callee11$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          _context11.next = 2;
          return regeneratorRuntime.awrap(_sellerModel["default"].findById(req.params.id));

        case 2:
          seller = _context11.sent;

          if (!seller) {
            _context11.next = 10;
            break;
          }

          _context11.next = 6;
          return regeneratorRuntime.awrap(seller.deleteOne());

        case 6:
          ;
          res.send({
            message: 'Seller Deleted'
          });
          _context11.next = 11;
          break;

        case 10:
          res.status(404).send({
            message: 'Seller Not Found'
          });

        case 11:
        case "end":
          return _context11.stop();
      }
    }
  });
})); // Get seller referral statistics

sellerRouter.get('/:id/referral-stats', (0, _expressAsyncHandler["default"])(function _callee12(req, res) {
  var sellerId, referredUsersCount, referredOrders, totalReferredSales, commissionRate, totalCommission, recentReferredOrders;
  return regeneratorRuntime.async(function _callee12$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          sellerId = req.params.id; // Count referred users

          _context12.next = 3;
          return regeneratorRuntime.awrap(_userModel["default"].countDocuments({
            referredBy: sellerId
          }));

        case 3:
          referredUsersCount = _context12.sent;
          _context12.next = 6;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            referredBy: sellerId
          }).populate('user', 'name email').sort({
            createdAt: -1
          }));

        case 6:
          referredOrders = _context12.sent;
          // Calculate total referred sales
          totalReferredSales = referredOrders.reduce(function (sum, order) {
            return sum + order.totalPrice;
          }, 0); // Calculate commission (10% of referred sales)

          commissionRate = 0.10;
          totalCommission = totalReferredSales * commissionRate; // Get recent referred orders (last 10)

          recentReferredOrders = referredOrders.slice(0, 10);
          res.json({
            sellerId: sellerId,
            referredUsersCount: referredUsersCount,
            totalReferredOrders: referredOrders.length,
            totalReferredSales: totalReferredSales,
            commissionRate: commissionRate,
            totalCommission: totalCommission,
            recentReferredOrders: recentReferredOrders
          });

        case 12:
        case "end":
          return _context12.stop();
      }
    }
  });
})); // Get seller's referred users

sellerRouter.get('/:id/referred-users', (0, _expressAsyncHandler["default"])(function _callee13(req, res) {
  var sellerId, page, limit, skip, referredUsers, totalCount, totalPages;
  return regeneratorRuntime.async(function _callee13$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          sellerId = req.params.id;
          page = Number(req.query.page) || 1;
          limit = Number(req.query.limit) || 20;
          skip = (page - 1) * limit;
          _context13.next = 6;
          return regeneratorRuntime.awrap(_userModel["default"].find({
            referredBy: sellerId
          }).select('name email createdAt').sort({
            createdAt: -1
          }).skip(skip).limit(limit));

        case 6:
          referredUsers = _context13.sent;
          _context13.next = 9;
          return regeneratorRuntime.awrap(_userModel["default"].countDocuments({
            referredBy: sellerId
          }));

        case 9:
          totalCount = _context13.sent;
          totalPages = Math.ceil(totalCount / limit);
          res.json({
            page: page,
            totalPages: totalPages,
            totalCount: totalCount,
            users: referredUsers
          });

        case 12:
        case "end":
          return _context13.stop();
      }
    }
  });
})); // Get seller's referred orders

sellerRouter.get('/:id/referred-orders', (0, _expressAsyncHandler["default"])(function _callee14(req, res) {
  var sellerId, page, limit, skip, referredOrders, totalCount, totalPages, totalSales;
  return regeneratorRuntime.async(function _callee14$(_context14) {
    while (1) {
      switch (_context14.prev = _context14.next) {
        case 0:
          sellerId = req.params.id;
          page = Number(req.query.page) || 1;
          limit = Number(req.query.limit) || 20;
          skip = (page - 1) * limit;
          _context14.next = 6;
          return regeneratorRuntime.awrap(_orderModel["default"].find({
            referredBy: sellerId
          }).populate('user', 'name email').sort({
            createdAt: -1
          }).skip(skip).limit(limit));

        case 6:
          referredOrders = _context14.sent;
          _context14.next = 9;
          return regeneratorRuntime.awrap(_orderModel["default"].countDocuments({
            referredBy: sellerId
          }));

        case 9:
          totalCount = _context14.sent;
          totalPages = Math.ceil(totalCount / limit); // Calculate total sales for these orders

          totalSales = referredOrders.reduce(function (sum, order) {
            return sum + order.totalPrice;
          }, 0);
          res.json({
            page: page,
            totalPages: totalPages,
            totalCount: totalCount,
            totalSales: totalSales,
            orders: referredOrders
          });

        case 13:
        case "end":
          return _context14.stop();
      }
    }
  });
}));
var _default = sellerRouter;
exports["default"] = _default;