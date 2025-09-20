import mongoose from "mongoose";

const subunitSchema = new mongoose.Schema({
  label: { type: String, required: true }, // shown in UI
  value: { type: String, required: true }  // stored in DB
});

const unitSchema = new mongoose.Schema({
  label: { type: String, required: true }, // shown in UI
  value: { type: String, required: true }, // stored in DB
  subunits: [subunitSchema]                // array of subunits
});

const teacherUnitSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  units: [unitSchema]  // array of units for this teacher
}, { timestamps: true });

const TeacherUnit = mongoose.model("TeacherUnit", teacherUnitSchema);

export default TeacherUnit;
