import { Schema, model } from 'mongoose';

const questionSchema = new Schema({
    questionImage: { type: String, required: true },
    answerReviewImage: { type: String, required: true },
    correctAnswer: { type: Number, required: true },
    category: { type: String, required: true, default: 'GeneralCat' },
    subcategory: { type: String }
});

// New sub-schema for availability per institute
const availabilitySchema = new Schema({
    institute: { type:Schema.Types.ObjectId, ref: 'Institute', required: true},      // You can change this to ObjectId if referencing another collection
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true }
});

const paperSchema = new Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true, default: 'General' },
    author: { type: Schema.Types.ObjectId, ref: "Teacher", required: true},
    questions: [questionSchema],
    createdAt: { type: Date, default: Date.now },
    year: { type: String, required: true },
    category: { type: String, required: true, default: 'theory' },

    availability: [availabilitySchema] // 👈 New array of objects
});

export default model('Paper', paperSchema);



