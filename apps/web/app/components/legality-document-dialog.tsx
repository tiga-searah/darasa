import { ExternalLink, FileCheck2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";

interface LegalityDocumentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	fileName?: string;
	fileUrl?: string;
}

function isImageDocument(fileUrl?: string, fileName?: string): boolean {
	if (fileUrl?.startsWith("data:image/")) return true;
	if (fileName && /\.(jpe?g|png|webp)$/i.test(fileName)) return true;
	return false;
}

/**
 * Modal preview for reviewing uploaded business legality documents (image or PDF).
 */
export function LegalityDocumentDialog({
	open,
	onOpenChange,
	title,
	fileName,
	fileUrl,
}: LegalityDocumentDialogProps) {
	const isImage = isImageDocument(fileUrl, fileName);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[min(94dvw,680px)]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileCheck2 className="size-5 text-primary" aria-hidden="true" />
						<span>Surat Legalitas: {title}</span>
					</DialogTitle>
					<DialogDescription>
						{fileName || "Dokumen legalitas usaha"}
					</DialogDescription>
				</DialogHeader>

				{fileUrl ? (
					<div className="space-y-3">
						{isImage ? (
							<div className="overflow-hidden rounded-[10px] border border-border bg-muted/40">
								<img
									src={fileUrl}
									alt={`Surat legalitas ${title}`}
									className="max-h-[65dvh] w-full object-contain"
								/>
							</div>
						) : (
							<iframe
								title={`Pratinjau dokumen ${fileName || title}`}
								src={fileUrl}
								className="h-[60dvh] w-full rounded-[10px] border border-border bg-background"
							/>
						)}
						<div className="flex justify-end">
							<Button asChild variant="outline" size="sm">
								<a
									href={fileUrl}
									download={fileName || "surat-legalitas"}
									target="_blank"
									rel="noreferrer"
								>
									<ExternalLink className="size-4" aria-hidden="true" />
									Unduh / Buka Berkas
								</a>
							</Button>
						</div>
					</div>
				) : (
					<p className="rounded-[10px] border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
						Berkas pratinjau tidak tersedia pada data sampel prototipe ini. Nama
						dokumen tercatat: <strong>{fileName}</strong>.
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
