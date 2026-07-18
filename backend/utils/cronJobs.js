import cron from 'node-cron';
import Order from '../models/orderModel.js';
import Notification from '../models/notificationModel.js';
import Product from '../models/productModel.js';

const DISCOUNT_OFFER_TITLE = 'Discount Offer';
const DISCOUNT_OFFER_MESSAGE = 'Check out the latest discount offers!';
const DISCOUNT_OFFER_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;
// Fallback baseline provided by user: 5/16/2026, 8:04:27 PM.
const DISCOUNT_OFFER_LAST_SENT_FALLBACK = new Date('2026-05-16T20:04:27');

/**
 * Start cron job to send unpaid order reminders after 24 hours
 * Runs every hour to check for unpaid orders
 */
export const startUnpaidOrderReminders = () => {
  // Run every hour at the 0th minute: '0 * * * *'
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running unpaid order reminder cron job...');
    
    try {
      // Calculate 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find unpaid orders created more than 24 hours ago
      const unpaidOrders = await Order.find({
        isPaid: false,
        isCancelled: false,
        createdAt: { $lte: twentyFourHoursAgo },
        reminderSent: { $ne: true } // Only send reminder if not already sent
      }).populate('user');

      console.log(`Found ${unpaidOrders.length} unpaid orders after 24 hours`);

      // Create notifications for each unpaid order
      for (const order of unpaidOrders) {
        if (!order.user) continue; // Skip if user not found

        const orderId = order._id.toString().slice(0, 6).toUpperCase();
        const totalPrice = order.totalPrice.toFixed(2);

        const notification = new Notification({
          title: 'Payment Reminder',
          message: `Reminder: Your order #${orderId} ($${totalPrice}) is still unpaid after 24 hours. Please complete your payment to avoid cancellation.`,
          type: 'urgent',
          recipientType: 'user',
          userId: order.user._id,
          orderId: order._id, // Store full order ID
          isRead: false,
        });

        await notification.save();
        console.log(`✅ Notification created for order ${orderId}`);

        // Mark order as reminder sent
        order.reminderSent = true;
        await order.save();
      }

      console.log('✅ Unpaid order reminder cron job completed');
    } catch (error) {
      console.error('❌ Error in unpaid order reminder cron job:', error.message);
    }
  });

  console.log('✅ Unpaid order reminder cron job scheduled (runs every hour)');
};

/**
 * Start cron job to auto-cancel unpaid orders after 7 days
 * Restore product inventory and notify users
 */
export const startUnpaidOrderAutoCancel = () => {
  // Run every 6 hours: '0 */6 * * *'
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏱️ Running auto-cancel unpaid orders cron job...');
    
    try {
      // Calculate 7 days ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Find unpaid orders created more than 7 days ago that haven't been cancelled yet
      const expiredOrders = await Order.find({
        isPaid: false,
        isCancelled: false,
        createdAt: { $lte: sevenDaysAgo },
      }).populate('user');

      console.log(`Found ${expiredOrders.length} expired unpaid orders (7+ days)`);

      // Process each expired order
      for (const order of expiredOrders) {
        if (!order.user) continue; // Skip if user not found

        try {
          // Restore inventory for all products in the order
          for (const orderItem of order.orderItems) {
            if (!orderItem.isCustom && orderItem.product) {
              // Only restore if it's a regular product (not custom)
              const product = await Product.findById(orderItem.product);
              if (product) {
                product.countInStock += orderItem.quantity;
                await product.save();
                console.log(
                  `♻️ Restored ${orderItem.quantity} units of ${orderItem.name} to inventory`
                );
              }
            }
          }

          // Mark order as cancelled
          order.isCancelled = true;
          order.cancelledAt = new Date();
          await order.save();

          // Create cancellation notification
          const orderId = order._id.toString().slice(0, 6).toUpperCase();
          const totalPrice = order.totalPrice.toFixed(2);

          const notification = new Notification({
            title: 'Order Cancelled',
            message: `Your order #${orderId} ($${totalPrice}) has been automatically cancelled due to non-payment after 7 days. Products are now available for other customers.`,
            type: 'urgent',
            recipientType: 'user',
            userId: order.user._id,
            orderId: order._id, // Store full order ID
            isRead: false,
          });

          await notification.save();
          console.log(`✅ Order ${orderId} cancelled and inventory restored`);
        } catch (error) {
          console.error(`Error processing order ${order._id}:`, error.message);
        }
      }

      console.log('✅ Auto-cancel unpaid orders cron job completed');
    } catch (error) {
      console.error('❌ Error in auto-cancel unpaid orders cron job:', error.message);
    }
  });

  console.log('✅ Auto-cancel unpaid orders cron job scheduled (runs every 6 hours)');
};

/**
 * Optional: Clear old paid order reminders (can be extended for cleanup tasks)
 */
export const startCleanupTasks = () => {
  // Run daily at 2 AM: '0 2 * * *'
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running cleanup tasks...');
    try {
      // Could add more cleanup logic here (e.g., delete old notifications, archive old orders)
      console.log('✅ Cleanup tasks completed');
    } catch (error) {
      console.error('❌ Error in cleanup tasks:', error.message);
    }
  });

  console.log('✅ Cleanup tasks scheduled (runs daily at 2 AM)');
};

// ─────────────────────────────────────────────────────────────
// Overdue delivery reminders
// Scans paid + not-delivered orders and notifies admins when the
// expected delivery window (mirroring ShipMentPage rules) is being
// approached or has been exceeded. Deduped by (title + orderId) so
// each order generates at most one "Approaching" and one "Overdue"
// admin notification.
// ─────────────────────────────────────────────────────────────
const DOMESTIC_COUNTRIES = new Set([
  'usa',
  'us',
  'united states',
  'united states of america',
]);

const isDomesticCountry = (country = '') =>
  DOMESTIC_COUNTRIES.has(String(country).trim().toLowerCase());

// Inclusive business-day count between two dates (skips Sat/Sun).
// Returns full business days elapsed (0 on the same day).
const businessDaysBetween = (from, to) => {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  let days = 0;
  while (cursor <= endDay) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(0, days - 1);
};

export const startOverdueDeliveryReminders = () => {
  // Run once a day at 08:00 server time
  cron.schedule('0 8 * * *', async () => {
    console.log('📦 Running overdue delivery reminder cron job...');

    try {
      const pendingOrders = await Order.find({
        isPaid: true,
        isDelivered: false,
        isCancelled: { $ne: true },
      }).populate('user', '_id name email');

      console.log(`Found ${pendingOrders.length} paid + not-delivered orders`);

      let approachingCreated = 0;
      let overdueCreated = 0;

      for (const order of pendingOrders) {
        if (!order.paidAt) continue;

        const domestic = isDomesticCountry(order.shippingAddress?.country);
        // Processing (1–3) + shipping (domestic 1–10, international 5–30)
        const maxDays = 3 + (domestic ? 10 : 30);
        const elapsed = businessDaysBetween(order.paidAt, new Date());

        let title = null;
        let type = 'info';
        let messageBody = '';

        if (elapsed > maxDays) {
          title = 'Delivery Overdue';
          type = 'urgent';
          const over = elapsed - maxDays;
          messageBody =
            `Order #${order._id.toString().slice(-6).toUpperCase()} is ` +
            `${over} business day${over === 1 ? '' : 's'} past the expected ` +
            `${domestic ? 'domestic' : 'international'} delivery window ` +
            `(max ${maxDays} business days). Customer: ` +
            `${order.user?.name || 'Unknown'}. Destination: ` +
            `${order.shippingAddress?.country || '—'}.`;
        } else if (elapsed >= maxDays - 2) {
          title = 'Delivery Approaching Deadline';
          type = 'info';
          messageBody =
            `Order #${order._id.toString().slice(-6).toUpperCase()} is at ` +
            `${elapsed}/${maxDays} business days for a ` +
            `${domestic ? 'domestic' : 'international'} shipment. ` +
            `Please confirm delivery status before it becomes overdue.`;
        } else {
          continue; // still comfortably within window
        }

        // Dedup: don't create the same admin notification twice for this order
        const alreadySent = await Notification.findOne({
          title,
          orderId: order._id,
          recipientType: 'admin',
        });
        if (alreadySent) continue;

        await Notification.create({
          title,
          message: messageBody,
          type,
          recipientType: 'admin',
          orderId: order._id,
          link: `/order/${order._id}`,
        });

        if (title === 'Delivery Overdue') overdueCreated += 1;
        else approachingCreated += 1;
      }

      console.log(
        `✅ Overdue delivery cron completed — approaching: ${approachingCreated}, overdue: ${overdueCreated}`
      );
    } catch (error) {
      console.error('❌ Error in overdue delivery cron job:', error.message);
    }
  });

  console.log('✅ Overdue delivery reminder cron job scheduled (daily 08:00)');
};

/**
 * Broadcast discount offer to users at most once every 3 days.
 *
 * Why hourly check instead of every 3 days cron:
 * - resilient to server restarts/downtime
 * - sends as soon as eligible window is reached
 */
export const startDiscountOfferNotifications = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const latestDiscount = await Notification.findOne({
        title: DISCOUNT_OFFER_TITLE,
        message: DISCOUNT_OFFER_MESSAGE,
        type: 'discount',
        recipientType: 'user',
      })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean();

      const lastSentAt = latestDiscount?.createdAt
        ? new Date(latestDiscount.createdAt)
        : DISCOUNT_OFFER_LAST_SENT_FALLBACK;

      const now = new Date();
      const elapsedMs = now.getTime() - lastSentAt.getTime();

      if (elapsedMs < DISCOUNT_OFFER_INTERVAL_MS) {
        return;
      }

      await Notification.create({
        title: DISCOUNT_OFFER_TITLE,
        message: DISCOUNT_OFFER_MESSAGE,
        type: 'discount',
        recipientType: 'user', // broadcast to all users via existing query logic
        isRead: false,
      });

      console.log(
        `✅ Discount offer notification sent. Previous send: ${lastSentAt.toISOString()}`
      );
    } catch (error) {
      console.error('❌ Error in discount offer cron job:', error.message);
    }
  });

  console.log('✅ Discount offer cron job scheduled (eligibility check: hourly, send cadence: every 3 days)');
};
