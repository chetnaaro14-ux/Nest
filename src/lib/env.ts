export const getEnv = (key: string): string => {
  // Access import.meta.env safely
  try {
    const env = (import.meta as any).env || {};
    return env[key] || "";
  } catch (e) {
    console.warn(`Error accessing environment variable ${key}`, e);
    return "";
  }
};