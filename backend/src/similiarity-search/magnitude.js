const magnitude = (vector) => {
  if (!vector) throw new Error("Vector is required.");

  if (!Array.isArray(vector)) throw new Error("Input must be an array.");

  if (vector.length === 0) throw new Error("Vector cannot be empty.");

  return Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
}

export default magnitude;