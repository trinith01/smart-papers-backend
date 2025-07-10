import Paper from "../models/Paper.js";

export const createPaper = async (req, res) => {
  try {
    const { title, author, questions, availability, subject, year, category } = req.body;

    // Validate required fields
    if (!title || !author || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Title, author, and at least one question are required." });
    }

    // Create new paper
    const newPaper = new Paper({
      title,
      author,
      subject: subject || "General",  // optional, fallback to "General"
      questions,
      availability,                   // expect array of { institute, startTime, endTime }
      year,
      category: category || "theory"
    });

    // Save to database
    await newPaper.save();
    console.log("New Paper:", newPaper);

    res.status(201).json({ message: "Paper created successfully", paper: newPaper });
  } catch (error) {
    console.error("Error creating paper:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get papers where any availability startTime is in the future


export const getAvailablePapers = async (req, res) => {
  try {
    const { teacherId, category, year, instituteId } = req.query;

    if (!teacherId || !category || !year || !instituteId) {
      return res.status(400).json({ message: 'Missing query parameters.' });
    }

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // add 1 hour

    const papers = await Paper.find({
      author: teacherId,
      year,
      category,
      availability: {
        $elemMatch: {
          institute: instituteId,
        
        }
      }
    })
    .populate('author')
    .populate('availability.institute');

    res.status(200).json({
      message: "Available papers retrieved successfully",
      papers
    });

  } catch (error) {
    console.error("Error getting available papers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getAllPapers = async (req, res) => {
  try {
    const papers = await Paper.find().sort({ createdAt: -1 });

    if (papers.length === 0) {
      return res.status(404).json({ message: "No papers found." });
    }

    res.status(200).json({ message: "Papers retrieved successfully", papers });
  } catch (error) {
    console.error("Error getting all papers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getPapersByAuthor = async (req, res) => {
  try {
    const { authorId } = req.params;

    if (!authorId) {
      return res.status(400).json({ message: "Author ID is required." });
    }

    const papers = await Paper.find({ author: authorId }).sort({ createdAt: -1 }).populate('availability.institute');

    if (papers.length === 0) {
      return res.status(404).json({ message: "No papers found for this author." });
    }

    res.status(200).json({ message: "Papers retrieved successfully", papers });
  } catch (error) {
    console.error("Error getting papers by author:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}