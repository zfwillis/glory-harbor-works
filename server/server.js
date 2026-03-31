import dotenv from "dotenv";
import app from "./src/app.js";
import { connectDatabase } from "./src/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server without a database connection:", error.message);
    process.exit(1);
  }
};

startServer();
