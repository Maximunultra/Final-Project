import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ✅ Set up Supabase client
const SECRET_KEY = process.env.JWT_SECRET;  // Load from .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
export { supabase };  // ✅ Make sure this is exported

// Middleware
app.use(cors());
app.use(express.json()); // ✅ Fix: Ensure JSON request body is parsed


// Import Routes
import suppliersRoutes from "./routes/suppliers.js";
import ordersRoutes from "./routes/orders.js";
import stockRoutes from "./routes/stock.js";
import warehouseRoutes from "./routes/warehouse.js";
import stockMovementRoutes from "./routes/stockMovement.js";
import usersRoutes from "./routes/users.js";

// Use Routes
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/stock_movements", stockMovementRoutes);
app.use("/api/users", usersRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Hello from the backend!");
});

// ✅ Products CRUD API (Improved)
app.get("/api/products", async (req, res) => {
  try {
    const { data, error } = await supabase.from("products").select("*");
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message }); // ✅ Better error message
  }
});

// Create a new product
app.post("/api/products", async (req, res) => {
  const { name, sku, category, supplier_id, cost_price, selling_price } = req.body; // ✅ Fixed supplier_id

  try {
    const { data, error } = await supabase.from("products").insert([
      { name, sku, category, supplier_id, cost_price, selling_price },
    ]);
    if (error) throw error;
    res.json({ message: "Product added successfully", product: data });
  } catch (error) {
    res.status(500).json({ error: error.message }); // ✅ Improved error message
  }
});

// Update an existing product
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, sku, category, supplier_id, cost_price, selling_price } = req.body; // ✅ Fixed supplier_id

  try {
    const { data, error } = await supabase.from("products")
      .update({ name, sku, category, supplier_id, cost_price, selling_price })
      .eq("id", id);
    if (error) throw error;
    res.json({ message: "Product updated successfully", product: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a product
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
