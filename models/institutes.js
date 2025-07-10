import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema({
  name: {type: String, required: true},
  location: {type: String, required: true},
});

const Institute = mongoose.model('Institute', instituteSchema);
export default Institute;