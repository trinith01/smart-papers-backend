import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getStudyPlan = async (req, res) => {
  const units = req.body.units;

  const prompt = `
You are a physics tutor preparing a personalized study plan for a GCE A/L student in Sri Lanka.

Here is the student's study summary:

${JSON.stringify(units, null, 2)}

Please do the following:

1. Briefly summarize their weaknesses and strengths, based only on the given units.
2. Suggest a **7-day personalized study plan**, focusing on units with pending and incorrect answers.
3. Finish with a short motivational paragraph suitable for a local A/L student.

💡 Output the entire result in **clean, styled HTML or React JSX**.

✅ Format the output to:
- Use headings (<h2>, <h3>)
- Use bullet points for lists (<ul><li></li></ul>)
- Highlight weaknesses in <span style="color:red">red</span> and strengths in <span style="color:green">green</span>
- Wrap everything in a <div> with padding
- Optionally use **Tailwind CSS** classes if you want to style it

DO NOT return any explanation. Return only valid HTML or JSX ready to use in a frontend.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log(text);

    res.json({ output: text });
  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "Failed to generate study plan." });
  }
};  