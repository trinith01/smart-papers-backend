import Paper from "../models/Paper.js";
import { uploadBase64Image } from "../utils/s3Helper.js";
import { mapPaperImages } from "../utils/imageMapper.js";
import mongoose from "mongoose";

const API_BASE_URL = process.env.API_BASE_URL;

export const createPaper = async (req, res) => {
  try {
    const { title, author, questions, availability, subject, year, category } = req.body;

    // Validate required fields
    if (!title || !author || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Title, author, and at least one question are required." });
    }

    // Handle question images: upload to S3 and store image ID
    const processedQuestions = await Promise.all(
      questions.map(async (q) => {
        let imageId = q.questionImage;
        if (q.questionImage && q.questionImage.startsWith("data:image/jpeg;base64,")) {
          // Extract base64 part
          const base64 = q.questionImage.split(",").pop();
          imageId = await uploadBase64Image(base64);
        }
        // Optionally handle answerReviewImage similarly if needed
        return {
          ...q,
          questionImage: imageId, // store S3 image ID
        };
      })
    );

    // Create new paper
    const newPaper = new Paper({
      title,
      author,
      subject: subject || "General",  // optional, fallback to "General"
      questions: processedQuestions,
      availability,                   // expect array of { institute, startTime, endTime }
      year,
      category: category || "theory"
    });

    // Save to database
    await newPaper.save();
    console.log("New Paper:", newPaper);

    // Prepare response: replace questionImage with /image?id=... URL
    const paperObj = mapPaperImages(newPaper);

    res.status(201).json({ message: "Paper created successfully", paper: paperObj });
  } catch (error) {
    console.error("Error creating paper:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAvailablePapers = async (req, res) => {
  console.log("Get available papers request query:", req.query);
  try {
    const { teacherId, category, year, instituteId } = req.query;

    if (!teacherId || !category || !year || !instituteId) {
      return res.status(400).json({ message: 'Missing query parameters.' });
    }

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // add 1 hour

    console.log("Query params:", {
      teacherId,
      category,
      year,
      instituteId
    });

    const papers = await Paper.find({
      author: teacherId, // String comparison works fine
      year,
      category,
      availability: {
        $elemMatch: {
          institute: instituteId, // String comparison works fine
        }
      }
    })
    .populate('author')
    .populate('availability.institute');
    console.log(`Found ${papers.length} papers matching criteria.`);



    // Map questionImage to /image?id=... URL
    const mappedPapers = papers.map(mapPaperImages);
    
    // Filter papers based on availability for the specific institute
    const futurePapers = mappedPapers.filter(paper => {
      return paper.availability.some(avail => {
        // Handle different ways the institute might be stored/populated
        let instituteId_str;
        if (avail.institute && typeof avail.institute === 'object' && avail.institute._id) {
          // Populated object with _id
          instituteId_str = avail.institute._id.toString();
        } else if (avail.institute) {
          // Direct ObjectId or string
          instituteId_str = avail.institute.toString();
        }
        
        const instituteMatches = instituteId_str === instituteId;
        const startTime = new Date(avail.startTime);
        const isFuture = startTime > now;
        
        return instituteMatches && isFuture;
      });
    });
    
    const currentPapers = mappedPapers.filter(paper => {
      return paper.availability.some(avail => {
        // Handle different ways the institute might be stored/populated
        let instituteId_str;
        if (avail.institute && typeof avail.institute === 'object' && avail.institute._id) {
          // Populated object with _id
          instituteId_str = avail.institute._id.toString();
        } else if (avail.institute) {
          // Direct ObjectId or string
          instituteId_str = avail.institute.toString();
        }
        
        const instituteMatches = instituteId_str === instituteId;
        const startTime = new Date(avail.startTime);
        const endTime = new Date(avail.endTime);
        const isCurrent = startTime <= now && endTime >= now;
        
        return instituteMatches && isCurrent;
      });
    });

    res.status(200).json({
      message: "Available papers retrieved successfully",
      success: true,
      //papers: mappedPapers,
      futurePapers: futurePapers,
      currentPapers: currentPapers,
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

    const mappedPapers = papers.map(mapPaperImages);
    res.status(200).json({ message: "Papers retrieved successfully", papers: mappedPapers });
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

    const mappedPapers = papers.map(mapPaperImages);
    
    res.status(200).json({ message: "Papers retrieved successfully", papers: mappedPapers });
  } catch (error) {
    console.error("Error getting papers by author:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}