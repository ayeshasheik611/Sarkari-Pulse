import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  consumptionData: { type: Array, default: [] },
});

const Country = mongoose.model("Country", countrySchema);

export default Country;
