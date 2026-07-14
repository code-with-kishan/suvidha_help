import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'change_this_super_secret';

export const signJwt = (payload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const signJwtWithOptions = (payload, options = {}) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const verifyJwt = (token) => {
  return jwt.verify(token, getJwtSecret());
};
