import express from "express";
import { supabase } from "../server.js";  // ✅ Ensure correct import

const router = express.Router();

// Get all suppliers
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("suppliers").select("*");
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching suppliers" });
  }
});

export default router;
