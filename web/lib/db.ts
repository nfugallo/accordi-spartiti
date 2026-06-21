import { createClient, type Client } from "@libsql/client";
import path from "path";

let client: Client | null = null;

function getDatabaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  const dbPath = path.resolve(process.cwd(), "..", "data", "accordi.db");
  return `file:${dbPath}`;
}

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: getDatabaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}
