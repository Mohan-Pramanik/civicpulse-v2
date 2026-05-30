const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
  });
  logger.info(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connectDB;