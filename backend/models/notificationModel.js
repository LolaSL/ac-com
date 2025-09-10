import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'info' }, // info, discount, urgent, quote, etc.
    recipientType: {
      type: String,
      enum: ['user', 'admin', 'serviceProvider', 'all'],
      required: true
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Virtual for local date
notificationSchema.virtual('localDate').get(function () {
  const date = new Date(this.createdAt);
  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
