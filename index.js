import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./db.js";
import leadRoutes from "./routes/leadRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";

// load env
dotenv.config();

// connect database
connectDB();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

app.use("/api/leads", leadRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/properties", propertyRoutes);

// test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
