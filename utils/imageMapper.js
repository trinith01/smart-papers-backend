export function mapPaperImages(paper) {
  const API_BASE_URL = process.env.API_BASE_URL;
  const obj = paper.toObject ? paper.toObject() : paper;
  if (Array.isArray(obj.questions)) {
    obj.questions = obj.questions.map(q => {
      let image = null;
      if (q.questionImage) {
        if (q.questionImage.startsWith("data:image/")) {
          image = q.questionImage;
        } else if (q.questionImage.startsWith("http")) {
          image = q.questionImage;
        } else if (q.questionImage.startsWith("id=")) {
          image = `${API_BASE_URL}/image?${q.questionImage}`;
        } else {
          image = `${API_BASE_URL}/image?id=${q.questionImage}`;
        }
      }
      return {
        ...q,
        questionImage: image
      };
    });
  }
  return obj;
}
