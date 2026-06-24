const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api",
  isLocal: process.env.NODE_ENV === "development",
};

export default config;
