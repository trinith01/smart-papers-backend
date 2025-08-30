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

export function getImageUrl(value) {
  const API_BASE_URL = process.env.API_BASE_URL;
  if (!value) return null;

  if (value.startsWith("data:image/")) {
    return value; // base64 inline image
  } else if (value.startsWith("http")) {
    return value; // already full URL
  } else if (value.startsWith("id=")) {
    return `${API_BASE_URL}/image?${value}`; // id=123 → .../image?id=123
  } else {
    return `${API_BASE_URL}/image?id=${value}`; // plain id → .../image?id=123
  }
}

