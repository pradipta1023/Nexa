export const validateJson = (jsonString) => {
  if (!jsonString || jsonString.trim() === '') {
    return { isValid: true, parsed: null };
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return { isValid: true, parsed };
  } catch (error) {
    return { isValid: false, error: 'Invalid JSON format' };
  }
};
