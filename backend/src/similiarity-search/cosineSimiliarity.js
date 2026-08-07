import dotProduct from "./dotProduct.js"
import magnitude from "./magnitude.js";

const cosineSimiliarity = (vectorA, vectorB) => {
  if (!vectorA || !vectorB) throw new Error("Both the vectors must be provided");

  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) throw new Error("Both the input vectors must be array");

  const product = dotProduct(vectorA, vectorB);

  const denominator = magnitude(vectorA) * magnitude(vectorB);
  
  if (denominator === 0)
    throw new Error("Cosine similarity is undefined for zero vectors.");

  return product / denominator;
}

export default cosineSimiliarity;