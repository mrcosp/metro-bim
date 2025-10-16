import dotenv from 'dotenv';

dotenv.config();

export default function adminAuth(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return res.status(500).json({ error: 'Admin token not configured' });

  // Check header x-admin-token or Authorization: Bearer <token>
  const headerToken = req.headers['x-admin-token'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!headerToken || headerToken !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}
