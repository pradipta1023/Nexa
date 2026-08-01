import { v4 as uuidv4 } from 'uuid';

const createChunks = (words, { chunkSize, overlap }) => {
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize);
    chunks.push({ text: chunkWords.join(' '), id: uuidv4() });

    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

const chunker = (text, options = {}) => {
  const { chunkSize = 30, overlap = 5 } = options;

  if (!text || typeof text !== 'string') throw new Error('Text is required for chunking.');
  if (chunkSize <= 0) throw new Error('Chunk size must be a positive number.');
  if (overlap < 0) throw new Error('Overlap must be a non-negative number.');
  if (overlap >= chunkSize) throw new Error('Overlap must be less than chunk size.');

  const words = text.trim().split(/\s+/);
  return createChunks(words, { chunkSize, overlap });
}

export default chunker;