import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";

interface AuthSplitShellProps {
	title: string;
	subtitle?: string;
	imageSrc: string;
	fallbackImageSrc?: string;
	imageAlt: string;
	imagePosition: "left" | "right";
	children: ReactNode;
}

export function AuthSplitShell({
	title,
	subtitle,
	imageSrc,
	fallbackImageSrc = "/images/megono-1.jpg",
	imageAlt,
	imagePosition,
	children,
}: AuthSplitShellProps) {
	return (
		<div className="grid min-h-dvh w-full grid-cols-1 bg-card lg:grid-cols-2">
			<div
				className={cn(
					"hidden lg:block lg:h-dvh lg:sticky lg:top-0",
					imagePosition === "right" ? "lg:order-2" : "lg:order-1",
				)}
			>
				<div className="h-full w-full overflow-hidden bg-muted">
					<img
						src={imageSrc}
						alt={imageAlt}
						width={900}
						height={1200}
						fetchPriority="high"
						onError={(e) => {
							const img = e.currentTarget;
							if (!img.src.endsWith(fallbackImageSrc)) {
								img.src = fallbackImageSrc;
							}
						}}
						className="h-full w-full object-cover"
					/>
				</div>
			</div>

			<div
				className={cn(
					"flex min-h-dvh flex-col justify-between px-5 py-6 sm:px-10 lg:px-14 lg:py-8",
					imagePosition === "right" ? "lg:order-1" : "lg:order-2",
				)}
			>
				<header className="flex w-full items-center">
					<Link
						to="/"
						className="inline-flex min-h-[44px] items-center gap-2.5 rounded-[6px] text-base font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<ArrowLeft className="size-5 shrink-0" aria-hidden="true" />
						<span>Kembali</span>
					</Link>
				</header>

				<main
					id="main-content"
					tabIndex={-1}
					className="mx-auto my-8 w-full max-w-[420px] space-y-6"
				>
					<div className="space-y-3 text-center">
						<div className="inline-flex items-center justify-center gap-2.5">
							<img
								src="/images/darasa.webp"
								alt=""
								width={36}
								height={36}
								className="size-9 shrink-0 object-contain"
							/>
							<span className="text-lg font-bold tracking-tight text-foreground">
								Darasa
							</span>
						</div>

						<div className="space-y-1">
							<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
								{title}
							</h1>
							{subtitle ? (
								<p className="text-sm text-muted-foreground">{subtitle}</p>
							) : null}
						</div>
					</div>

					{children}
				</main>

				<footer className="text-center text-xs text-muted-foreground">
					<p>© 2026 Team Lorem Ipsum · Kuliner Kabupaten Batang</p>
				</footer>
			</div>
		</div>
	);
}
