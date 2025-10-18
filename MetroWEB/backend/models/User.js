import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  // CPF will be stored as a hashed value (cpfHash)
  cpfHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Force collection name to 'tbusuario' to match existing DB
const User = mongoose.model('User', userSchema, 'tbusuario');
export default User;
