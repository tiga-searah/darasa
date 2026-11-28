import { Eye, FileCheck2, FileText, Upload, X } from "lucide-react";
import { type ChangeEvent, type DragEvent, useState } from "react";
import { LegalityDocumentDialog } from "~/components/legality-document-dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { readLegalityDocumentFile } from "~/data/contribute";
import { cn } from "~/lib/utils";

interface LegalityDocumentFieldProps {
	id: string;
	label: string;
	required?: boolean;
	helperText?: string;
	fileName: string;
	fileUrl?: string;
	error?: string | null;
	onChangeFile: (file: { fileName: string; fileUrl: string } | null) => void;
	onError?: (error: string | null) => void;
}

/**
 * Reusable upload field for business legality documents (NIB, SKU, SIUP, etc.)
 * supporting PDF, JPG, PNG, and WebP up to 10 MB.
 */
export function LegalityDocumentField({
	id,
	label,
	required = false,
	helperText,
	fileName,
	fileUrl,
	error,
	onChangeFile,
	onError,
}: LegalityDocumentFieldProps) {
	const [isDragActive, setIsDragActive] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);

	const processFile = async (file: File | undefined) => {
		if (!file) return;
		const result = await readLegalityDocumentFile(file);
		if (result.error) {
			onError?.(result.error);
			return;
		}
		onError?.(null);
		onChangeFile({ fileName: result.fileName, fileUrl: result.url });
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		void processFile(file);
		e.target.value = "";
	};

	const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragActive(false);
		void processFile(e.dataTransfer.files?.[0]);
	};

	const isImagePreview = Boolean(
		fileUrl?.startsWith("data:image/") ||
			(fileName && /\.(jpe?g|png|webp)$/i.test(fileName)),
	);

	return (
		<div className="space-y-2">
			<div className="space-y-0.5">
				<Label htmlFor={id}>
					{label}{" "}
					{required ? (
						<span className="text-red-text">*</span>
					) : (
						<span className="text-xs font-normal text-muted-foreground">
							(opsional)
						</span>
					)}
				</Label>
				{helperText ? (
					<p className="text-xs text-muted-foreground leading-relaxed">
						{helperText}
					</p>
				) : null}
			</div>

			{fileName ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-primary/40 bg-primary-soft/35 p-3">
					<div className="flex min-w-0 items-center gap-3">
						{isImagePreview && fileUrl ? (
							<img
								src={fileUrl}
								alt={`Pratinjau ${fileName}`}
								width={48}
								height={48}
								className="size-12 shrink-0 rounded-[8px] border border-border object-cover"
							/>
						) : (
							<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-primary-soft text-primary-hover">
								<FileText className="size-5" aria-hidden="true" />
							</span>
						)}
						<div className="min-w-0">
							<p className="truncate text-sm font-medium text-foreground">
								{fileName}
							</p>
							<p className="text-xs text-primary-hover">Berkas siap dikirim</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5">
						{fileUrl ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setPreviewOpen(true)}
							>
								<Eye className="size-3.5" aria-hidden="true" />
								Pratinjau
							</Button>
						) : null}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								onError?.(null);
								onChangeFile(null);
							}}
							aria-label="Hapus surat legalitas"
						>
							<X className="size-4" aria-hidden="true" />
							Hapus
						</Button>
					</div>
				</div>
			) : (
				<label
					htmlFor={id}
					onDragOver={(e) => {
						e.preventDefault();
						setIsDragActive(true);
					}}
					onDragLeave={() => setIsDragActive(false)}
					onDrop={handleDrop}
					className={cn(
						"flex min-h-[76px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed px-4 py-4 text-center text-sm transition-colors",
						isDragActive
							? "border-primary bg-primary-soft/60 text-foreground"
							: error
								? "border-secondary-red bg-red-soft/30 text-foreground"
								: "border-border bg-background/60 text-muted-foreground hover:border-primary hover:text-foreground",
					)}
				>
					<span className="inline-flex items-center gap-2 font-medium text-foreground">
						{required ? (
							<FileCheck2 className="size-4 text-primary" aria-hidden="true" />
						) : (
							<Upload className="size-4 text-primary" aria-hidden="true" />
						)}
						<span>Pilih atau seret surat legalitas ke sini</span>
					</span>
					<span className="text-xs text-muted-foreground">
						PDF, JPG, PNG, atau WebP maksimal 10 MB
					</span>
				</label>
			)}

			<input
				id={id}
				type="file"
				accept=".pdf,image/jpeg,image/png,image/webp"
				required={required && !fileName}
				aria-invalid={Boolean(error)}
				onChange={handleFileChange}
				className="sr-only"
			/>

			{error ? (
				<p role="alert" className="text-xs font-medium text-red-text">
					{error}
				</p>
			) : null}

			{fileUrl ? (
				<LegalityDocumentDialog
					open={previewOpen}
					onOpenChange={setPreviewOpen}
					title={label}
					fileName={fileName}
					fileUrl={fileUrl}
				/>
			) : null}
		</div>
	);
}
