import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  client: { type: String, required: true },
  subject: { type: String, default: '' },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  projectName: { type: String, required: true },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;
