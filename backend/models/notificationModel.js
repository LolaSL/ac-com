import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'urgent', 'discount', 'quote'], default: 'info' },
  recipientType: { type: String, enum: ['admin', 'user', 'serviceProvider', 'all'], required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // <--- Add this
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true }
);
notificationSchema.virtual('localDate').get(function() {
  const date = new Date(this.createdAt);
  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000); 
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});


const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
