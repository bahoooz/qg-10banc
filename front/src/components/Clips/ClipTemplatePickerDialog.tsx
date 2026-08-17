import { Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useClipTemplates,
  useDeleteClipTemplate,
} from "../../hooks/useClipTemplates";
import { apiUrl } from "../../lib/apiUrl";
import type {
  ClipTemplateDetail,
  ClipTemplateListItem,
} from "../../lib/clipTemplate";
import { useClipEditorStore } from "../../stores/clipEditorStore";

type ClipTemplatePickerDialogProps = {
  open: boolean;
  onClose: () => void;
};

function formatTemplateDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type TemplateRowProps = {
  template: ClipTemplateListItem;
  onApply: () => void;
  onDelete: () => void;
  isApplying: boolean;
  isDeleting: boolean;
};

function TemplateRow({
  template,
  onApply,
  onDelete,
  isApplying,
  isDeleting,
}: TemplateRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-secondary-color/50 bg-background-secondary/60 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white/85">{template.name}</p>
        <p className="text-[10px] text-white/35">
          Modifiée {formatTemplateDate(template.updatedAt)}
        </p>
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={isApplying || isDeleting}
        className="shrink-0 rounded-lg border border-main-color/40 bg-main-color/10 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-main-color transition-all hover:bg-main-color/15 disabled:opacity-40"
      >
        {isApplying ? <Loader2 className="size-3.5 animate-spin" /> : "Appliquer"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isApplying || isDeleting}
        className="shrink-0 rounded-lg border border-secondary-color/50 p-1.5 text-white/35 transition-all hover:border-red-400/40 hover:text-red-400 disabled:opacity-40"
        aria-label={`Supprimer ${template.name}`}
      >
        {isDeleting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </button>
    </div>
  );
}

export default function ClipTemplatePickerDialog({
  open,
  onClose,
}: ClipTemplatePickerDialogProps) {
  const { data: templates = [], isLoading, isError } = useClipTemplates();
  const deleteTemplate = useDeleteClipTemplate();
  const applyClipTemplate = useClipEditorStore((s) => s.applyClipTemplate);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!open) return null;

  const handleApply = async (templateId: string) => {
    setApplyingId(templateId);
    try {
      const res = await fetch(apiUrl(`/clip-templates/${templateId}`), {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Impossible de charger la template");
      }
      const detail = (await res.json()) as ClipTemplateDetail;
      applyClipTemplate(detail.payload);
      toast.success("Template appliquée");
      onClose();
    } catch {
      toast.error("Impossible d'appliquer la template");
    } finally {
      setApplyingId(null);
    }
  };

  const handleDelete = (templateId: string) => {
    setDeletingId(templateId);
    deleteTemplate.mutate(templateId, {
      onSettled: () => setDeletingId(null),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clip-template-picker-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(80vh,560px)] w-full max-w-md flex-col rounded-2xl border border-secondary-color/60 bg-background shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-secondary-color/40 p-5">
          <div>
            <h2
              id="clip-template-picker-title"
              className="text-sm font-extrabold uppercase tracking-[0.12em] text-main-color"
            >
              Utiliser une template
            </h2>
            <p className="mt-1 text-xs text-white/40">
              Restaure layout, montage et sous-titres sur toutes les étapes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/40">
              <Loader2 className="size-4 animate-spin" />
              Chargement…
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-red-400/80">
              Impossible de charger vos templates.
            </p>
          ) : templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              Aucune template sauvegardée. Créez-en une depuis l'étape Export.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <TemplateRow
                  key={template.id}
                  template={template}
                  onApply={() => void handleApply(template.id)}
                  onDelete={() => handleDelete(template.id)}
                  isApplying={applyingId === template.id}
                  isDeleting={deletingId === template.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
