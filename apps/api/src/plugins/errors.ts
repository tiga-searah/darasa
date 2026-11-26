import {
	Elysia,
	ElysiaStatus,
	NotFound,
	ParseError,
	ValidationError,
} from "elysia";
import { ApiError } from "../utils";

export const errorPlugin = new Elysia({ name: "errors", as: "plugin" }).onError(
	"global",
	({ error, set }) => {
		if (error instanceof ApiError) {
			set.status = error.status;
			return {
				error: {
					code: error.code,
					message: error.message,
					...(error.fields ? { fields: error.fields } : {}),
				},
			};
		}

		if (error instanceof ValidationError) {
			set.status = 422;
			const fields: Record<string, string> = {};
			for (const e of error.errors)
				fields[e.instancePath || "/"] = e.message ?? "Invalid value";
			return {
				error: { code: "VALIDATION_ERROR", message: "Invalid input", fields },
			};
		}

		if (error instanceof NotFound) {
			set.status = 404;
			return { error: { code: "NOT_FOUND", message: "Route not found" } };
		}

		if (error instanceof ParseError) {
			set.status = 400;
			return {
				error: { code: "VALIDATION_ERROR", message: "Malformed request body" },
			};
		}

		if (error instanceof ElysiaStatus) {
			set.status = error.status;
			return {
				error: { code: "VALIDATION_ERROR", message: String(error.response) },
			};
		}

		console.error(error);
		set.status = 500;
		return {
			error: { code: "INTERNAL_ERROR", message: "Internal server error" },
		};
	},
);
