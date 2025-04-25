import pdfjsLib from 'pdfjs-dist';

/**
 * Extracts text from a PDF buffer.
 * @param {Buffer} buffer - The PDF file buffer.
 * @returns {Promise<string>} - Extracted text.
 */
export const extractTextFromPDF = async (buffer) => {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    textContent.items.forEach((item) => {
      fullText += item.str + ' ';
    });
  }

  return fullText;
};

/**
 * Detects doors based on keywords in the extracted text.
 * @param {string} text - The extracted text from the PDF.
 * @returns {Array} - List of detected doors with positions (mock for now).
 */
export const detectDoorsInPDF = (text) => {
  const doorKeywords = ['DOOR', 'DR', 'ENTRANCE']; 
  const doors = [];

  doorKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      doors.push({
        keyword: match[0],
        index: match.index, 
      });
    }
  });

  return doors;
};





