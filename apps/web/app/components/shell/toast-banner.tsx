import { CheckCircle2, Info, X } from "lucide-react";
import type { ToastNotification } from "~/context/darasa-store";

interface ToastBannerProps {
	toast: ToastNotification | null;
	onDismiss: () => void;
}

export function ToastBanner({ toast, onDismiss }: ToastBannerProps) {
	if (!toast) return null;

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-[12px] border border-border bg-card px-4 py-3 text-sm shadow-lg sm:left-auto sm:right-5 lg:bottom-5"
		>
			<div className="pointer-events-auto flex w-full items-center gap-2.5">
				{toast.tone === "success" ? (
					<CheckCircle2
						className="size-4 shrink-0 text-primary"
						aria-hidden="true"
					/>
				) : (
					<Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
				)}
				<p role="status" className="flex-1 font-medium text-foreground">
					{toast.message}
				</p>
				<button
					type="button"
					onClick={onDismiss}
					aria-label="Tutup notifikasi"
					className="inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-background hover:text-foreground"
				>
					<X className="size-4" aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
