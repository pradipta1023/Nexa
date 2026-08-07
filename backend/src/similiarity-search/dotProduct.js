const dotProduct = (vectorA, vectorB) => {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) throw new Error("Both inputs must be arrays.");

  if (vectorA.length === 0 || vectorB.length === 0) throw new Error("Vectors cannot be empty.");

  if (vectorA.length !== vectorB.length) throw new Error("Vectors must be of the same length.");

  return vectorA.reduce((sum, value, index) => sum + value * vectorB[index], 0);
}

export default dotProduct;