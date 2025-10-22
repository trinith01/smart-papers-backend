import mongoose from "mongoose";


const paperStatsSchema = new mongoose.Schema({
    paperId: { type: mongoose.Schema.Types.ObjectId, ref: "Paper", required: true },
    QuestionResults: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Paper.questions", required: true },
        totalIncorrect: { type: Number, default: 0 },
        
    }],
    
    
    
    instituteStats: [{ 
        instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
        averageMarks: { type: Number, default: 0 },
        totalStudents: { type: Number, default: 0 },
        maxMarks: { type: Number, default: 0 },
        minMarks: { type: Number, default: 0 },
        topStudents:[{type: mongoose.Schema.Types.ObjectId, ref:"Submission"}]
     }],



})
export default mongoose.model("PaperStats", paperStatsSchema);
