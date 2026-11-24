import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	layout("routes/app-layout.tsx", [
		index("routes/explore.tsx"),
		route("hidden-gem", "routes/hidden-gem.tsx"),
		route("places/:slug", "routes/place-detail.tsx"),
		route("submit-place", "routes/submit-place.tsx"),
		route("claim", "routes/claim.tsx"),
		route("owner", "routes/owner.tsx"),
		route("admin", "routes/admin.tsx"),
	]),
	layout("routes/auth-layout.tsx", [
		route("login", "routes/login.tsx"),
		route("register", "routes/register.tsx"),
	]),
] satisfies RouteConfig;
