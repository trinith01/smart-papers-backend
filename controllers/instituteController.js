import Institute from "../models/institutes.js";

// Create a new institute
export const createInstitute = async (req, res) => {
    try {
        let institutesData = req.body;
        // If a single object is sent, wrap it in an array
        if (!Array.isArray(institutesData)) {
            institutesData = [institutesData];
        }
        const institutes = await Institute.insertMany(institutesData);
        res.status(201).json(institutes);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all institutes
export const getInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find();
    res.status(200).json(institutes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single institute by ID
export const getInstituteById = async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) return res.status(404).json({ error: "Institute not found" });
    res.status(200).json(institute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an institute
export const updateInstitute = async (req, res) => {
  try {
    const { name, location } = req.body;
    const institute = await Institute.findByIdAndUpdate(
      req.params.id,
      { name, location },
      { new: true, runValidators: true }
    );
    if (!institute) return res.status(404).json({ error: "Institute not found" });
    res.status(200).json(institute);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete an institute
export const deleteInstitute = async (req, res) => {
  try {
    const institute = await Institute.findByIdAndDelete(req.params.id);
    if (!institute) return res.status(404).json({ error: "Institute not found" });
    res.status(200).json({ message: "Institute deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
