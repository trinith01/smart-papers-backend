import { Schema, model } from 'mongoose';
import Institute from './institutes.js';

const studentSchema = new Schema({
  name: { type: String, required: true },
  uuid: { type: String, required: true, unique: true },
  barcode: { type: String, default: null },
 
  email: { type: String, required: true, unique: true },
  year: { type: String, required: true },
  preferredFollowedTeacher: { type: Number, default: 0 },
 
  // Track which teacher is followed under which institute
  followedTeachers: [
    {
      teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
      institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
      category: [{ type: String, required: true }]
    }
  ]
});

export default model('Student', studentSchema);
