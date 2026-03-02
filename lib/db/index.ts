import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// This client is only used in server-side contexts (API routes, Server Components)
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

export * from "./schema";
