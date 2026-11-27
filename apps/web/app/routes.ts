import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	layout("routes/app-layout.tsx", [
		index("routes/home.tsx"),
		route("explore", "routes/explore.tsx"),
		route("hidden-gem", "routes/hidden-gem.tsx"),
		route("contribute", "routes/contribute.tsx"),
		route("contribute/add-place", "routes/contribute-add-place.tsx"),
		route("contribute/write-review", "routes/contribute-write-review.tsx"),
		route("contribute/add-photo", "routes/contribute-add-photo.tsx"),
		route("contribute/update-info", "routes/contribute-update-info.tsx"),
		route("bookmarks", "routes/bookmarks.tsx"),
		route("places/:slug", "routes/place-detail.tsx"),
		route("claim", "routes/claim.tsx"),
		route("owner", "routes/owner.tsx"),
		route("admin", "routes/admin.tsx"),
	]),
	layout("routes/auth-layout.tsx", [
		route("login", "routes/login.tsx"),
		route("register", "routes/register.tsx"),
	]),
] satisfies RouteConfig;
