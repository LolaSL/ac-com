"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _expressAsyncHandler = _interopRequireDefault(require("express-async-handler"));

var _notificationModel = _interopRequireDefault(require("../models/notificationModel.js"));

var _utils = require("../utils.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var notificationRouter = _express["default"].Router(); // GET notifications


notificationRouter.get('/', _utils.isAuth, (0, _expressAsyncHandler["default"])(function _callee(req, res) {
  var notifications;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          console.log('Logged-in user info:', req.user);

          if (!req.user.isAdmin) {
            _context.next = 7;
            break;
          }

          _context.next = 4;
          return regeneratorRuntime.awrap(_notificationModel["default"].find({
            $or: [{
              recipientType: 'admin',
              userId: {
                $exists: false
              }
            }, // General admin notifications
            {
              recipientType: 'admin',
              userId: req.user._id
            }, // Specific admin notifications
            {
              recipientType: 'all'
            } // General notifications
            ]
          }).sort({
            createdAt: -1
          }).lean({
            virtuals: true
          }));

        case 4:
          notifications = _context.sent;
          _context.next = 10;
          break;

        case 7:
          _context.next = 9;
          return regeneratorRuntime.awrap(_notificationModel["default"].find({
            $or: [{
              recipientType: req.user.type,
              userId: req.user._id
            }, // Their specific notifications
            {
              recipientType: req.user.type,
              userId: {
                $exists: false
              }
            }, // General for their type
            {
              recipientType: 'all'
            } // General notifications
            ]
          }).sort({
            createdAt: -1
          }).lean({
            virtuals: true
          }));

        case 9:
          notifications = _context.sent;

        case 10:
          console.log('Fetched notifications recipientTypes:', notifications.map(function (n) {
            return n.recipientType;
          }));
          res.json(notifications);

        case 12:
        case "end":
          return _context.stop();
      }
    }
  });
})); // MARK notification as read

notificationRouter.put('/:id/read', _utils.isAuth, (0, _expressAsyncHandler["default"])(function _callee2(req, res) {
  var notification;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return regeneratorRuntime.awrap(_notificationModel["default"].findById(req.params.id));

        case 2:
          notification = _context2.sent;

          if (!notification) {
            _context2.next = 10;
            break;
          }

          notification.isRead = true;
          _context2.next = 7;
          return regeneratorRuntime.awrap(notification.save());

        case 7:
          res.json({
            message: 'Notification marked as read'
          });
          _context2.next = 11;
          break;

        case 10:
          res.status(404).send({
            message: 'Notification not found'
          });

        case 11:
        case "end":
          return _context2.stop();
      }
    }
  });
})); // CREATE a new notification (Admin only)

notificationRouter.post('/', _utils.isAuth, _utils.isAdmin, (0, _expressAsyncHandler["default"])(function _callee3(req, res) {
  var _req$body, title, message, type, recipientType, notification, createdNotification;

  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _req$body = req.body, title = _req$body.title, message = _req$body.message, type = _req$body.type, recipientType = _req$body.recipientType;
          notification = new _notificationModel["default"]({
            title: title,
            message: message,
            type: type,
            recipientType: recipientType
          });
          _context3.next = 4;
          return regeneratorRuntime.awrap(notification.save());

        case 4:
          createdNotification = _context3.sent;
          res.status(201).json(createdNotification);

        case 6:
        case "end":
          return _context3.stop();
      }
    }
  });
})); // DELETE a notification (Admin only)

notificationRouter["delete"]('/:id', _utils.isAuth, _utils.isAdmin, (0, _expressAsyncHandler["default"])(function _callee4(req, res) {
  var notification;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(_notificationModel["default"].findById(req.params.id));

        case 2:
          notification = _context4.sent;

          if (notification) {
            _context4.next = 5;
            break;
          }

          return _context4.abrupt("return", res.status(404).send({
            message: 'Notification not found'
          }));

        case 5:
          _context4.next = 7;
          return regeneratorRuntime.awrap(notification.deleteOne());

        case 7:
          res.status(200).send({
            message: 'Notification deleted successfully'
          });

        case 8:
        case "end":
          return _context4.stop();
      }
    }
  });
}));
var _default = notificationRouter;
exports["default"] = _default;