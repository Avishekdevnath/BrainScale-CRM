import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Helper to clean connection string (remove quotes, trim)
function getMongoUrl(): string {
  const url = process.env.MONGO_URL || process.env.MONGODB_URL || env("MONGO_URL") || env("MONGODB_URL");
  if (!url) {
    throw new Error('MongoDB connection URL not found. Please set MONGO_URL or MONGODB_URL in your .env file');
  }
  // Remove surrounding quotes and trim whitespace
  return url.trim().replace(/^["']|["']$/g, '');
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  datasource: {
    url: getMongoUrl(),
  },
});
