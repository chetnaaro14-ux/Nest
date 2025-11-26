export const getEnv = (key: string): string => {
  // Access import.meta.env safely
  try {
    return (import.meta as any).env[key] || "";
  } catch (e) {
    console.warn(`Error accessing environment variable ${key}`, e);
    return "";
  }
};