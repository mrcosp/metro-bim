import dotenv from 'dotenv';

dotenv.config();

export default function adminAuth(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return res.status(500).json({ error: 'Admin token not configured' });

  // Check header x-admin-token or Authorization: Bearer <token>
  let headerToken = req.headers['x-admin-token'];
  if (!headerToken && typeof req.headers.authorization === 'string') {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      headerToken = authHeader.slice(7).trim();
    }
  }
  if (!headerToken || headerToken !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}
