import { Schema, model } from "mongoose";

const submissionJobSchema = new Schema({
  jobId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  paperId: { 
    type: Schema.Types.ObjectId, 
    ref: "Paper", 
    required: true 
  },
  instituteId: { 
    type: Schema.Types.ObjectId, 
    ref: "Institute", 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["queued", "processing", "completed", "failed"], 
    default: "queued",
    index: true
  },
  submissionId: { 
    type: Schema.Types.ObjectId, 
    ref: "Submission",
    default: null
  },
  result: {
    score: { type: Number },
    total: { type: Number },
    correctAnswers: { type: Number },
  },
  error: { 
    type: String,
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  startedAt: { 
    type: Date,
    default: null
  },
  completedAt: { 
    type: Date,
    default: null
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for querying student's jobs
submissionJobSchema.index({ studentId: 1, createdAt: -1 });

// TTL index to auto-delete completed/failed jobs after 7 days
submissionJobSchema.index({ completedAt: 1 }, { 
  expireAfterSeconds: 604800, // 7 days
  partialFilterExpression: { 
    status: { $in: ["completed", "failed"] } 
  }
});

export default model("SubmissionJob", submissionJobSchema);
