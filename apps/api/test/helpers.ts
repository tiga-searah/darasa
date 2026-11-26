import { sql } from "drizzle-orm";
import { type AppDeps, createApp } from "../src/app";
import { db } from "../src/database";

export const freshApp = (deps?: AppDeps) => createApp(deps);

export async function resetDb(): Promise<void> {
	const rows = await db.execute<{ tablename: string }>(
		sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
	);
	const tables = rows.map((r) => `"public"."${r.tablename}"`);
	if (tables.length === 0) return;
	await db.execute(
		sql.raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`),
	);
}

export const json = (res: Response): Promise<any> => res.json();

export const cookieOf = (res: Response): string | undefined =>
	res.headers.get("set-cookie")?.split(";")[0];
