import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  generic: String,
  brands: [String],
  strength: String,
  form: String,
  rx: String
}, { versionKey: false });

const pharmacySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: String,
  lat: Number,
  lng: Number,
  phone: String,
  hours: String,
  demo: { type: Boolean, default: true },
  verification: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending"
  }
}, { versionKey: false });

const inventorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  pharmacyId: { type: String, required: true, index: true },
  medicineId: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  lastVerifiedAt: { type: Date, default: null },
  source: { type: String, default: "DEMO" }
}, { versionKey: false });

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  role: {
    type: String,
    enum: ["patient", "pharmacy", "admin"],
    default: "patient"
  },
  pharmacyId: { type: String, default: null },
  hash: { type: String, required: true }
}, { versionKey: false });

const reportSchema = new mongoose.Schema({
  inventoryId: { type: String, required: true },
  note: { type: String, maxlength: 300 },
  at: { type: Date, default: Date.now }
}, { versionKey: false });

const auditSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  actor: String,
  action: String,
  target: String
}, { versionKey: false });

export const Medicine = mongoose.model("Medicine", medicineSchema, "medicines");
export const Pharmacy = mongoose.model("Pharmacy", pharmacySchema, "pharmacies");
export const Inventory = mongoose.model("Inventory", inventorySchema, "inventory");
export const User = mongoose.model("User", userSchema, "users");
export const Report = mongoose.model("Report", reportSchema, "reports");
export const AuditLog = mongoose.model("AuditLog", auditSchema, "auditlogs");
