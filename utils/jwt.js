const jwt = require('jsonwebtoken');

const generateAccessToken = (userId, userType, roleIds, companyId = null) => {
  const payload = { 
    userId, 
    userType, 
    roleIds,
    type: 'access'
  };
  
  if (companyId) {
    payload.companyId = companyId;
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
    }
  );
};

const generateRefreshToken = (userId, companyId = null) => {
  const payload = { 
    userId, 
    type: 'refresh'
  };
  
  if (companyId) {
    payload.companyId = companyId;
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' 
    }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error('Invalid token format');
  }
};

const generateTokenPair = (userId, userType, roleIds, companyId = null) => {
  const accessToken = generateAccessToken(userId, userType, roleIds, companyId);
  const refreshToken = generateRefreshToken(userId, companyId);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  generateTokenPair
};
