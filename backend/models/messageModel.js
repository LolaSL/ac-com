import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  client: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
  serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  projectName:{ type: String, required: true }
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
