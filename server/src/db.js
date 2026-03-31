import mongoose from "mongoose";

const READY_STATE_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getMongoReadyStateLabel = (readyState) => READY_STATE_LABELS[readyState] || "unknown";

export const getDatabaseHealth = (mongooseInstance = mongoose) => {
  const connection = mongooseInstance.connection || {};
  const readyState = Number(connection.readyState ?? 0);

  return {
    status: readyState === 1 ? "up" : "down",
    readyState,
    state: getMongoReadyStateLabel(readyState),
    host: connection.host || "",
    name: connection.name || "",
  };
};

export const connectDatabase = async ({
  uri = process.env.MONGO_URI,
  mongooseInstance = mongoose,
  logger = console,
  maxRetries = 5,
  retryDelayMs = 2000,
} = {}) => {
  if (!uri) {
    throw new Error("MONGO_URI not set in environment variables");
  }

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const connection = await mongooseInstance.connect(uri);
      logger.log(`Connected to MongoDB on attempt ${attempt}`);
      return connection;
    } catch (error) {
      lastError = error;
      logger.error(`MongoDB connection attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        await delay(retryDelayMs);
      }
    }
  }

  throw lastError;
};
