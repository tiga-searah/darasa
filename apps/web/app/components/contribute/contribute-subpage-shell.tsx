import { LogIn, PlusCircle, UserCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { useDarasa } from "~/context/darasa-store";
import { ContributePageHeader } from "./contribute-page-header";

export interface ContributeSubpageShellProps {
	title: string;
	description: string;
	redirectPath: string;
	children: ReactNode;
}

export function ContributeSubpageShell({
	title,
	description,
	redirectPath,
	children,
}: ContributeSubpageShellProps) {
	const { hydrated, currentUser, switchDemoAccount } = useDarasa();
	const isVisitor = currentUser.role === "visitor";

	if (!hydrated) {
		return (
			<section
				aria-busy="true"
				aria-label={`Memuat halaman ${title.toLowerCase()}`}
				className="space-y-6 pb-8"
			>
				<div className="space-y-3 border-b border-border pb-5">
					<div className="h-6 w-40 rounded-[6px] bg-muted" />
					<div className="h-8 w-64 max-w-full rounded-[6px] bg-muted" />
					<div className="h-4 w-80 max-w-full rounded-[6px] bg-muted" />
				</div>
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
					<div className="lg:col-span-7 space-y-4">
						<div className="h-6 w-48 rounded-[6px] bg-muted" />
						<div className="h-24 rounded-[10px] bg-muted" />
						<div className="h-11 w-36 rounded-[8px] bg-muted" />
					</div>
					<div className="lg:col-span-5 space-y-4">
						<div className="h-48 rounded-[10px] bg-muted" />
					</div>
				</div>
				<p role="status" className="text-xs text-muted-foreground">
					Memuat formulir kontribusi...
				</p>
			</section>
		);
	}

	return (
		<div className="space-y-6 pb-8">
			<ContributePageHeader title={title} description={description} />

			{isVisitor ? (
				<section
					aria-labelledby="contribute-visitor-gate-heading"
					className="py-8 text-center space-y-5"
				>
					<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-hover">
						<PlusCircle className="size-6" aria-hidden="true" />
					</div>
					<div className="space-y-1.5">
						<h2
							id="contribute-visitor-gate-heading"
							className="text-lg font-semibold text-foreground"
						>
							Masuk untuk {title.toLowerCase()}
						</h2>
						<p className="mx-auto max-w-md text-sm text-muted-foreground">
							Setiap penambahan tempat, ulasan, foto, dan pembaruan info
							tercatat atas nama akun kontributor Anda agar data kuliner Batang
							tetap tepercaya.
						</p>
					</div>
					<div className="flex flex-wrap justify-center gap-2.5">
						<Button
							type="button"
							onClick={() => switchDemoAccount("usr-warga")}
							className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<UserCheck className="size-4" aria-hidden="true" />
							Coba sebagai Warga (Raka)
						</Button>
						<Button
							asChild
							variant="outline"
							className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`}>
								<LogIn className="size-4" aria-hidden="true" />
								Masuk Akun
							</Link>
						</Button>
						<Button
							asChild
							variant="ghost"
							className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<Link to="/register">Daftar Baru</Link>
						</Button>
					</div>
				</section>
			) : (
				children
			)}
		</div>
	);
}
