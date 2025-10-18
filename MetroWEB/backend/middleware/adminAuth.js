import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

export default async function adminAuth(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;

  // 1) If ADMIN_TOKEN is configured and provided, accept it
  let headerToken = req.headers['x-admin-token'];
  if (!headerToken && typeof req.headers.authorization === 'string') {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) headerToken = authHeader.slice(7).trim();
  }
  if (adminToken && headerToken && headerToken === adminToken) return next();

  // 2) Otherwise, expect admin email + cpf in headers and validate against DB
  const adminEmail = req.headers['x-admin-email'];
  const adminCpf = req.headers['x-admin-cpf'];
  if (!adminEmail || !adminCpf) return res.status(401).json({ error: 'Admin credentials required' });

  try {
    const user = await User.findOne({ email: adminEmail });
    if (!user) return res.status(401).json({ error: 'Admin not found' });
    if (!user.isAdmin) return res.status(403).json({ error: 'Forbidden: not admin' });

    const match = await bcrypt.compare(adminCpf, user.cpfHash);
    if (!match) return res.status(401).json({ error: 'Invalid admin credentials' });

    return next();
  } catch (err) {
    console.error('adminAuth error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
