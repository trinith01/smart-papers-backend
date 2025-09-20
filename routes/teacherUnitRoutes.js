import express from "express";
import {
  addUnit,
  addSubUnit,
  deleteUnit,
  deleteSubUnit,
  updateUnit,
  updateSubUnit,
  bulkAddUnits,
  getUnitsofTeacher
} from "../controllers/teacherUnitControllers.js";

const techerUnitRouter = express.Router();

// ✅ Unit Routes
techerUnitRouter.get("/:teacherId/units", getUnitsofTeacher);                     
techerUnitRouter.post("/:teacherId/units", addUnit);                     // Add Unit
techerUnitRouter.put("/:teacherId/units/:unitLabel", updateUnit);        // Update Unit
techerUnitRouter.delete("/:teacherId/units/:unitLabel", deleteUnit);     // Delete Unit
techerUnitRouter.post("/:teacherId/units/bulk", bulkAddUnits);          // Bulk Add Units

// ✅ SubUnit Routes
techerUnitRouter.post("/:teacherId/units/:unitLabel/subunits", addSubUnit);                       // Add SubUnit
techerUnitRouter.put("/:teacherId/units/:unitLabel/subunits/:subunitLabel", updateSubUnit);       // Update SubUnit
techerUnitRouter.delete("/:teacherId/units/:unitLabel/subunits/:subunitLabel", deleteSubUnit);    // Delete SubUnit

export default techerUnitRouter;
