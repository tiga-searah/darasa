import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "./relations";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) throw new Error("DATABASE_URL is not set");

export const db = drizzle({ connection: url, relations });

export { schema };
