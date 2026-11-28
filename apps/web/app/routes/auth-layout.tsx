import { ArrowLeft } from "lucide-react";
import { Link, Outlet } from "react-router";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";

export default function AuthLayout() {
	return (
		<div className="min-h-dvh bg-background flex flex-col justify-between px-4 py-8 sm:px-6">
			<header className="mx-auto flex w-full max-w-[420px] items-center justify-between gap-3">
				<Button
					asChild
					variant="ghost"
					size="sm"
					className="-ml-3 min-h-[44px]"
				>
					<Link to="/">
						<ArrowLeft className="size-4" aria-hidden="true" />
						Kembali ke Jelajah Darasa
					</Link>
				</Button>
				<ThemeToggle />
			</header>

			<main
				id="main-content"
				tabIndex={-1}
				className="mx-auto my-8 w-full max-w-[420px]"
			>
				<div className="mb-6 flex items-center gap-3">
					<img
						src="/images/darasa.webp"
						alt=""
						width={40}
						height={40}
						className="size-10 shrink-0 object-contain"
					/>
					<div>
						<span className="block text-xl font-bold tracking-tight text-foreground">
							Darasa
						</span>
						<span className="block text-xs text-muted-foreground">
							Direktori Kuliner Komunitas Kabupaten Batang
						</span>
					</div>
				</div>

				<Outlet />
			</main>

			<footer className="mx-auto w-full max-w-[420px] text-center text-xs text-muted-foreground">
				<p>Darasa Prototipe · Kabupaten Batang, Jawa Tengah</p>
			</footer>
		</div>
	);
}
