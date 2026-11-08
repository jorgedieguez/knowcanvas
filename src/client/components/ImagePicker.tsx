import { ImagePlus, Link2, Loader2, UploadCloud, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { Resource } from "../../shared/contracts";
import { api } from "../api";
import { normalizeExternalImageUrl, prepareImage } from "../resources/images";
import { Dialog } from "./ui/Dialog";

export interface SelectedImage {
  resourceId: string | null;
  url: string;
  alt: string;
}

export function ImagePicker({
  onClose,
  onSelect,
  initialFile = null,
  initialUrl = "",
}: {
  onClose: () => void;
  onSelect: (image: SelectedImage) => void;
  initialFile?: File | null;
  initialUrl?: string;
}) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [url, setUrl] = useState(initialUrl);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api
      .listResources()
      .then(setResources)
      .catch(() => setError("No se pudo cargar la biblioteca."));
  }, []);

  async function upload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const prepared = await prepareImage(file);
      const resource = await api.uploadResource(
        prepared.blob,
        prepared.name,
        prepared.width,
        prepared.height,
      );
      onSelect({ resourceId: resource.id, url: resource.url, alt: alt.trim() || file.name });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la imagen.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialFile) void upload(initialFile);
  }, [initialFile]);

  const externalUrl = normalizeExternalImageUrl(url);
  return (
    <Dialog className="resource-picker" labelledBy="resource-title" onDismiss={onClose}>
      <header>
        <div>
          <span>RECURSOS</span>
          <h2 id="resource-title">Añadir una imagen</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar selector" data-autofocus>
          <X size={18} />
        </button>
      </header>
      <div className="resource-picker-body">
        <section>
          <h3>Biblioteca</h3>
          {resources.length ? (
            <div className="resource-grid">
              {resources.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() =>
                    onSelect({ resourceId: resource.id, url: resource.url, alt: resource.name })
                  }
                >
                  <img src={resource.url} alt="" />
                  <span>{resource.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="resource-empty">
              <ImagePlus size={28} />
              <strong>Todavía no hay imágenes</strong>
            </div>
          )}
        </section>
        <aside>
          <label className="resource-upload">
            {busy ? <Loader2 className="spin" size={20} /> : <UploadCloud size={20} />}
            <strong>Cargar desde el equipo</strong>
            <span>Se optimizará y guardará en tu Google Drive.</span>
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(event) => void upload(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className="resource-url">
            <Link2 size={18} />
            <strong>Usar una URL</strong>
            <label>
              <span>Dirección</span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
              />
            </label>
            <label>
              <span>Texto alternativo</span>
              <input
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                placeholder="Describe la imagen"
              />
            </label>
            <button
              type="button"
              disabled={!externalUrl || !alt.trim()}
              onClick={() => onSelect({ resourceId: null, url: externalUrl, alt: alt.trim() })}
            >
              Insertar URL
            </button>
          </div>
          {error ? (
            <p className="resource-error" role="alert">
              {error}
            </p>
          ) : null}
        </aside>
      </div>
    </Dialog>
  );
}
