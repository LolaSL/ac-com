import cron from 'node-cron';
import Order from '../models/orderModel.js';
import Notification from '../models/notificationModel.js';
import Product from '../models/productModel.js';

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
