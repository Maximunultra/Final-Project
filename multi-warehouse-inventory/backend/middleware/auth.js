import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
  
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      req.user = decoded; // add user data to request
      next();
    } catch (error) {
      res.status(403).json({ error: 'Invalid token' });
    }
  };