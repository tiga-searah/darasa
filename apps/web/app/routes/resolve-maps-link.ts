import { resolveGoogleMapsLink } from "~/lib/maps-server";
import type { Route } from "./+types/resolve-maps-link";

export async function loader({ request }: Route.LoaderArgs) {
	const reqUrl = new URL(request.url);
	const targetUrl = reqUrl.searchParams.get("url")?.trim() ?? "";

	if (!targetUrl) {
		return Response.json(
			{ ok: false, error: "Parameter url wajib diisi." },
			{ status: 400 },
		);
	}

	const resolution = await resolveGoogleMapsLink(targetUrl);
	return Response.json(resolution, {
		status: resolution.ok ? 200 : 422,
	});
}
