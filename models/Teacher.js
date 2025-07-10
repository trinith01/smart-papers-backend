import { Schema, model } from 'mongoose';

const teacherSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },

  institute: [{ type: Schema.Types.ObjectId, ref: 'Institute', required: true }],
  uuid: { type: String, required: true, unique: true },
  subjects: { type: String, required: true },
  
  

});

export default model('Teacher', teacherSchema);
