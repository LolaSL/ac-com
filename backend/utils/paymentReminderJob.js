import cron from 'node-cron';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';

/**
 * Payment reminder escalation stages.
 * minHours: the order must be at least this old before sending this stage.
 * Stages are checked from highest to lowest — the highest unapplied stage
 * eligible by age is sent once per order per cron run.
 * No maxHours ceiling, so the job catches up even if the server was down.
 */
const REMINDER_STAGES = [
  {
    stage: 1,
    label: 'reminder-1h',
    minHours: 1,
    title: 'Complete Your Payment',
    type: 'info',
    message: (shortId, total) =>
      `Your order #${shortId} is awaiting payment. Total: $${total}. Complete your payment to confirm the order.`,
  },
  {
    stage: 2,
    label: 'reminder-24h',
    minHours: 24,
    title: 'Payment Reminder',
    type: 'urgent',
    message: (shortId, total) =>
      `Reminder: Your order #${shortId} ($${total}) is still unpaid after 24 hours. Please complete your payment to avoid cancellation.`,
  },
  {
    stage: 3,
    label: 'reminder-3d',
    minHours: 72,
    title: 'Urgent: Order Pending Payment',
    type: 'urgent',
    message: (shortId, total) =>
      `Your order #${shortId} ($${total}) has been unpaid for 3 days. Please complete your payment soon or the order may be cancelled.`,
  },
  {
    stage: 4,
    label: 'reminder-7d',
    minHours: 168,
    title: 'Final Notice: Order Will Be Cancelled',
    type: 'urgent',
    message: (shortId, total) =>
      `Final notice: Your order #${shortId} ($${total}) will be cancelled if payment is not received within 24 hours.`,
  },
];

/**
 * Runs every hour.
 * For each unpaid order, checks which reminder stage applies based on order age
 * and sends the notification if it hasn't been sent yet for that stage.
 * After 192 hours (8 days), auto-cancels the order and restores product stock.
 */
export function startPaymentReminderJob() {
  cron.schedule('0 * * * *', async () => {
    console.log('[PaymentReminder] Running hourly payment reminder check...');

    try {
      const unpaidOrders = await Order.find({ isPaid: false, isCancelled: false }).populate(
        'user',
        '_id name'
      );

      if (unpaidOrders.length === 0) {
        console.log('[PaymentReminder] No unpaid orders found.');
        return;
      }

      let totalSent = 0;

      for (const order of unpaidOrders) {
        if (!order.user) continue;

        const orderAgeHours =
          (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
        const orderLink = `/order/${order._id}`;
        const shortId = order._id.toString().slice(-6);
        const total = order.totalPrice.toFixed(2);

        // Iterate from highest stage to lowest — find the highest stage the order
        // has aged past that hasn't been sent yet, then send it and move on.
        const stagesDesc = [...REMINDER_STAGES].reverse();

        for (const stage of stagesDesc) {
          // Skip stages the order hasn't aged into yet
          if (orderAgeHours < stage.minHours) continue;

          // Check if this stage reminder was already sent for this order
          const alreadySent = await Notification.findOne({
            title: stage.title,
            link: orderLink,
            userId: order.user._id,
          });

          if (alreadySent) break; // Highest eligible stage already sent — nothing more to do

          await Notification.create({
            title: stage.title,
            message: stage.message(shortId, total),
            type: stage.type,
            recipientType: 'user',
            userId: order.user._id,
            link: orderLink,
          });

          console.log(
            `[PaymentReminder] Stage ${stage.stage} reminder sent for order #${shortId} (age: ${orderAgeHours.toFixed(1)}h)`
          );
          totalSent++;
          break; // One reminder per order per run
        }

        // ── Auto-cancel after 8 days (192h) ──────────────────────────────────
        if (orderAgeHours >= 192) {
          // Restore stock for each real (non-custom) product in the order
          for (const item of order.orderItems) {
            if (!item.isCustom && item.product) {
              await Product.findByIdAndUpdate(item.product, {
                $inc: { countInStock: item.quantity },
              });
            }
          }

          // Mark order as cancelled
          order.isCancelled = true;
          order.cancelledAt = new Date();
          order.cancellationReason = 'Auto-cancelled due to non-payment after 8 days';
          await order.save();

          // Notify user
          if (order.user) {
            await Notification.create({
              title: 'Order Cancelled',
              message: `Your order #${shortId} ($${total}) has been automatically cancelled due to non-payment. The reserved items have been restocked.`,
              type: 'urgent',
              recipientType: 'user',
              userId: order.user._id,
              link: orderLink,
            });
          }

          console.log(
            `[PaymentReminder] Order #${shortId} auto-cancelled after ${orderAgeHours.toFixed(1)}h unpaid. Stock restored.`
          );
        }
      }

      console.log(
        `[PaymentReminder] Done. Sent ${totalSent} reminder(s) for ${unpaidOrders.length} unpaid order(s).`
      );

      // ── Admin: Pending Orders Alert (once per day) ────────────────────────
      const pendingCount = await Order.countDocuments({ isPaid: false, isCancelled: false });
      if (pendingCount > 0) {
        const oneDayAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
        const alreadyAlerted = await Notification.findOne({
          title: 'Pending Orders Alert',
          recipientType: 'admin',
          createdAt: { $gte: oneDayAgo },
        });

        if (!alreadyAlerted) {
          const admins = await User.find({ isAdmin: true }, '_id');
          for (const admin of admins) {
            await Notification.create({
              title: 'Pending Orders Alert',
              message: `There are currently ${pendingCount} unpaid order${pendingCount === 1 ? '' : 's'} pending payment. Immediate action may be required.`,
              type: 'info',
              recipientType: 'admin',
              userId: admin._id,
            });
          }
          console.log(`[PaymentReminder] Admin alert sent: ${pendingCount} pending order(s).`);
        }
      }
    } catch (err) {
      console.error('[PaymentReminder] Job failed:', err.message);
    }
  });

  console.log('[PaymentReminder] Hourly payment reminder job scheduled.');
}

