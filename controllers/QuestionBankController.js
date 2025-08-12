import QuestionBank from "../models/questionBank.js";

import { uploadBase64Image } from "../utils/s3Helper.js";

export const addQuestion = async (req, res) => {
  const { authorId } = req.params;
  let newQuestion = req.body;

  try {
    // Handle questionImage if base64 string
    if (
      newQuestion.questionImage &&
      newQuestion.questionImage.startsWith("data:image/")
    ) {
      const base64 = newQuestion.questionImage.split(",").pop();
      newQuestion.questionImage = await uploadBase64Image(base64);
    }

    // Handle answerImage if base64 string
    if (
      newQuestion.answerImage &&
      newQuestion.answerImage.startsWith("data:image/")
    ) {
      const base64 = newQuestion.answerImage.split(",").pop();
      newQuestion.answerImage = await uploadBase64Image(base64);
    }

    // Find existing question set for this author
    let set = await QuestionBank.findOne({ author: authorId });

    if (!set) {
      // Create new question set document
      set = new QuestionBank({
        author: authorId,
        questions: [newQuestion],
      });
    } else {
      // Add question to existing set
      set.questions.push(newQuestion);
    }

    // Save changes
    const saved = await set.save();
    res.status(201).json({message: "Question added successfully", saved , success:true});
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};


// Get all sets
export const getAllSets = async (req, res) => {
  try {
    const sets = await QuestionBank.find().populate("author", "name email");
    res.json(sets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get set by author
export const getSetByAuthor = async (req, res) => {
  try {
    const set = await QuestionBank.findOne({ author: req.params.authorId });
    res.json(set || { questions: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a specific question
export const updateQuestion = async (req, res) => {
  const { authorId, questionId } = req.params;

  try {
    const set = await QuestionBank.findOne({ author: authorId });
    const question = set.questions.id(questionId);

    if (!question) return res.status(404).json({ error: "Question not found" });

    Object.assign(question, req.body);
    await set.save();

    res.json(set);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a question
export const deleteQuestion = async (req, res) => {
  const { authorId, questionId } = req.params;

  try {
    const set = await QuestionBank.findOne({ author: authorId });
    set.questions = set.questions.filter(q => q._id.toString() !== questionId);
    await set.save();
    res.json({ message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
