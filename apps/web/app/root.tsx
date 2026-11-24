import {
	isRouteErrorResponse,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { DarasaProvider } from "~/context/darasa-store";
import { THEME_COLOR_LIGHT, THEME_INIT_SCRIPT } from "~/lib/theme";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="id">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta
					name="theme-color"
					content={THEME_COLOR_LIGHT}
					suppressHydrationWarning
				/>
				<meta
					name="color-scheme"
					content="light dark"
					suppressHydrationWarning
				/>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: Synchronous inline script prevents dark/light FOUC before first paint */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<Meta />
				<Links />
			</head>
			<body>
				<a href="#main-content" className="skip-link">
					Lewati ke konten utama
				</a>
				<DarasaProvider>{children}</DarasaProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Terjadi Kesalahan";
	let details = "Halaman gagal dimuat dengan semestinya.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message =
			error.status === 404
				? "Halaman Tidak Ditemukan (404)"
				: `Galat ${error.status}`;
		details =
			error.status === 404
				? "Tautan yang Anda buka tidak tersedia di Darasa."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main id="main-content" className="mx-auto max-w-xl px-6 py-20">
			<Card className="p-8 space-y-4">
				<h1 className="text-2xl font-bold text-foreground">{message}</h1>
				<p className="text-sm text-muted-foreground">{details}</p>
				<Button asChild>
					<Link to="/">Kembali ke Jelajah Kuliner</Link>
				</Button>
				{stack ? (
					<pre className="mt-4 overflow-x-auto rounded-[8px] bg-background p-4 text-xs text-muted-foreground">
						<code>{stack}</code>
					</pre>
				) : null}
			</Card>
		</main>
	);
}
