import TeacherUnit from "../models/techerUnitSchema.js";
export const getUnitsofTeacher = async (req, res) => {
  const { teacherId } = req.params;
  try {
    let teacherUnit = await TeacherUnit.findOne({ teacher: teacherId });
    if (!teacherUnit) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    return res.status(200).json(teacherUnit.units);
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
}
// ✅ Add Unit
export const addUnit = async (req, res) => {
  const { teacherId } = req.params;
  const { label, value } = req.body;

  try {
    let teacherUnit = await TeacherUnit.findOne({ teacher: teacherId });
    if (!teacherUnit) {
      teacherUnit = new TeacherUnit({ teacher: teacherId, units: [] });
    }

    const unitExists = teacherUnit.units.some((unit) => unit.label === label);
    if (unitExists) {
      return res.status(400).json({ message: "Unit already exists" });
    }

    teacherUnit.units.push({ label, value, subunits: [] });
    await teacherUnit.save();
    res.status(201).json(teacherUnit);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Add SubUnit
export const addSubUnit = async (req, res) => {
  const { teacherId } = req.params;
  const { unitLabel, subunitLabel, subunitValue } = req.body;

  try {
    const teacherUnit = await TeacherUnit.findOne({ teacher: teacherId });
    if (!teacherUnit) return res.status(404).json({ message: "Teacher not found" });

    const unit = teacherUnit.units.find((u) => u.label === unitLabel);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    const subunitExists = unit.subunits.some((su) => su.label === subunitLabel);
    if (subunitExists) return res.status(400).json({ message: "Subunit already exists" });

    unit.subunits.push({ label: subunitLabel, value: subunitValue });
    await teacherUnit.save();

    res.status(201).json(teacherUnit);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete Unit
export const deleteUnit = async (req, res) => {
  const { teacherId, unitLabel } = req.params;

  try {
    const teacherUnit = await TeacherUnit.findOne({ teacher: teacherId });
    if (!teacherUnit) return res.status(404).json({ message: "Teacher not found" });

    teacherUnit.units = teacherUnit.units.filter((u) => u.label !== unitLabel);
    await teacherUnit.save();

    res.status(200).json({ message: "Unit deleted", teacherUnit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete SubUnit
export const deleteSubUnit = async (req, res) => {
  const { teacherId, unitLabel, subunitLabel } = req.params;

  try {
    const teacherUnit = await TeacherUnit.findOne({ teacher: teacherId });
    if (!teacherUnit) return res.status(404).json({ message: "Teacher not found" });

    const unit = teacherUnit.units.find((u) => u.label === unitLabel);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    unit.subunits = unit.subunits.filter((su) => su.label !== subunitLabel);
    await teacherUnit.save();

    res.status(200).json({ message: "Subunit deleted", teacherUnit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update Unit
export const updateUnit = async (req, res) => {
  const { teacherId, unitLabel } = req.params;
  const { newLabel, newValue } = req.body;

  try {
    const teacherUnit = await TeacherUnit.findOne({ teacher: teacherId });
    if (!teacherUnit) return res.status(404).json({ message: "Teacher not found" });

    const unit = teacherUnit.units.find((u) => u.label === unitLabel);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    unit.label = newLabel || unit.label;
    unit.value = newValue || unit.value;
    await teacherUnit.save();

    res.status(200).json({ message: "Unit updated", teacherUnit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update SubUnit
export const updateSubUnit = async (req, res) => {
  const { teacherId, unitLabel, subunitLabel } = req.params;
  const { newLabel, newValue } = req.body;

  try {
    const teacherUnit = await TeacherUnit.findOne({ teacher: teacherId });
    if (!teacherUnit) return res.status(404).json({ message: "Teacher not found" });

    const unit = teacherUnit.units.find((u) => u.label === unitLabel);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    const subunit = unit.subunits.find((su) => su.label === subunitLabel);
    if (!subunit) return res.status(404).json({ message: "Subunit not found" });

    subunit.label = newLabel || subunit.label;
    subunit.value = newValue || subunit.value;
    await teacherUnit.save();

    res.status(200).json({ message: "Subunit updated", teacherUnit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ✅ Add multiple units + subunits at once
export const bulkAddUnits = async (req, res) => {
  const { teacherId } = req.params;
  const { units } = req.body; 
  /*
    Expected format:
    {
      "units": [
        {
          "label": "Mathematics",
          "value": "math",
          "subunits": [
            { "label": "Algebra", "value": "algebra" },
            { "label": "Geometry", "value": "geometry" }
          ]
        },
        {
          "label": "Science",
          "value": "sci",
          "subunits": [
            { "label": "Physics", "value": "phy" },
            { "label": "Chemistry", "value": "chem" }
          ]
        }
      ]
    }
  */

  try {
    let teacherUnit = await TeacherUnit.findOne({ teacher: teacherId });

    if (!teacherUnit) {
      teacherUnit = new TeacherUnit({ teacher: teacherId, units: [] });
    }

    // Add units if they don't already exist
    for (const newUnit of units) {
      const unitExists = teacherUnit.units.some((u) => u.label === newUnit.label);
      if (!unitExists) {
        teacherUnit.units.push({
          label: newUnit.label,
          value: newUnit.value,
          subunits: newUnit.subunits || [],
        });
      } else {
        // If unit already exists, merge subunits
        const existingUnit = teacherUnit.units.find((u) => u.label === newUnit.label);
        for (const sub of newUnit.subunits || []) {
          const subExists = existingUnit.subunits.some((su) => su.label === sub.label);
          if (!subExists) {
            existingUnit.subunits.push({ label: sub.label, value: sub.value });
          }
        }
      }
    }

    await teacherUnit.save();
    res.status(201).json({ message: "Units added/merged successfully", teacherUnit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
