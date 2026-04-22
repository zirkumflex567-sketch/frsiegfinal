"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PageContent } from "@/lib/content/content-page-schema";
import { getMediaUrl } from "@/lib/content/page-view-model";

type MediaAsset = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
};

type HomeLivePageProps = {
  pageId: string | null;
  initialTitle: string;
  initialStatus: PageStatus;
  initialContent: PageContent;
  canEdit: boolean;
  startInEditMode: boolean;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type SavePageRequest = {
  pageId: string | null;
  title: string;
  status: PageStatus;
  content: PageContent;
};

type UploadMediaRequest = {
  file: File | null;
};

type PageStatus = "draft" | "published";

type EditorSnapshot = {
  title: string;
  status: PageStatus;
  content: PageContent;
};

export async function parseJsonSafely(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function resolveApiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

export async function requestMediaList(fetchLike: FetchLike = fetch): Promise<MediaAsset[]> {
  let response: Response;

  try {
    response = await fetchLike("/api/admin/media", { cache: "no-store" });
  } catch {
    throw new Error("Medien konnten nicht geladen werden.");
  }

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(resolveApiErrorMessage(data, "Medien konnten nicht geladen werden."));
  }

  const payload = data as { media?: MediaAsset[] } | null;
  return Array.isArray(payload?.media) ? payload.media : [];
}

export async function requestSavePage(
  payload: SavePageRequest,
  fetchLike: FetchLike = fetch,
): Promise<void> {
  if (!payload.pageId) {
    throw new Error("Keine Seiten-ID gefunden. Bitte im Admin zuerst Seite anlegen.");
  }

  let response: Response;

  try {
    response = await fetchLike(`/api/admin/pages/${payload.pageId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        status: payload.status,
        content: payload.content,
      }),
    });
  } catch {
    throw new Error("Speichern fehlgeschlagen.");
  }

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(resolveApiErrorMessage(data, "Speichern fehlgeschlagen."));
  }
}

export async function requestUploadMedia(
  payload: UploadMediaRequest,
  fetchLike: FetchLike = fetch,
): Promise<void> {
  if (!payload.file) {
    throw new Error("Bitte erst eine Datei auswählen.");
  }

  const formData = new FormData();
  formData.set("file", payload.file);

  let response: Response;

  try {
    response = await fetchLike("/api/admin/media", {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("Upload fehlgeschlagen.");
  }

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(resolveApiErrorMessage(data, "Upload fehlgeschlagen."));
  }
}

export function needsPublishConfirmation(previousStatus: PageStatus, nextStatus: PageStatus) {
  return previousStatus === "draft" && nextStatus === "published";
}

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const fontFamilyOptions = [
  { value: "Inter, system-ui, sans-serif", label: "Modern (Inter)" },
  { value: "Arial, Helvetica, sans-serif", label: "Klassisch (Arial)" },
  { value: "'Trebuchet MS', Verdana, sans-serif", label: "Rund & klar" },
  { value: "Georgia, 'Times New Roman', serif", label: "Seriös (Serif)" },
];

const fontWeightOptions = [
  { value: "400", label: "Normal" },
  { value: "500", label: "Mittel" },
  { value: "600", label: "Kräftig" },
  { value: "700", label: "Fett" },
];

export function HomeLivePage({
  pageId,
  initialTitle,
  initialStatus,
  initialContent,
  canEdit,
  startInEditMode,
}: HomeLivePageProps) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<PageStatus>(initialStatus);
  const [content, setContent] = useState<PageContent>(initialContent);
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [editorMode, setEditorMode] = useState<"simple" | "advanced">("simple");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<EditorSnapshot>({
    title: initialTitle,
    status: initialStatus,
    content: initialContent,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const hero = content.hero ?? {};
  const panels = content.panels ?? [];
  const partners = content.partners ?? [];
  const primaryColor = content.colors?.primary || "#2563eb";
  const surfaceColor = content.colors?.surface || "#f5f5f5";
  const headingColor = content.colors?.heading || "#1f2937";
  const bodyColor = content.colors?.body || "#374151";
  const fontFamily = content.typography?.fontFamily || "Inter, system-ui, sans-serif";
  const headingWeight = content.typography?.headingWeight || "700";
  const bodyWeight = content.typography?.bodyWeight || "400";

  const imageAssets = useMemo(
    () => media.filter((item) => item.mimeType.startsWith("image/")),
    [media],
  );

  async function loadMedia() {
    if (!canEdit) return;

    const mediaAssets = await requestMediaList(fetch);
    setMedia(mediaAssets);
  }

  async function savePage() {
    if (
      needsPublishConfirmation(savedSnapshot.status, status) &&
      typeof window !== "undefined" &&
      !window.confirm("Seite jetzt veröffentlichen? Danach ist sie öffentlich sichtbar.")
    ) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await requestSavePage({ pageId, title, status, content }, fetch);
      setSavedSnapshot({ title, status, content });
      setMessage("Gespeichert.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  }

  function discardChanges() {
    setTitle(savedSnapshot.title);
    setStatus(savedSnapshot.status);
    setContent(savedSnapshot.content);
    setMessage("Änderungen verworfen.");
    setError(null);
  }

  async function uploadMedia() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await requestUploadMedia({ file: uploadFile }, fetch);
      setUploadFile(null);
      await loadMedia();
      setMessage("Datei hochgeladen.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-6xl px-6 py-12" style={{ fontFamily }}>
        <section
          className="rounded-2xl border p-8"
          style={{
            borderColor: primaryColor,
            backgroundColor: surfaceColor,
          }}
        >
          {hero.backgroundAssetId ? (
            <Image
              src={getMediaUrl(hero.backgroundAssetId) ?? ""}
              alt="Hero Hintergrund"
              width={1280}
              height={480}
              className="mb-4 h-56 w-full rounded-xl object-cover"
              unoptimized
            />
          ) : null}

          <h1
            className="text-4xl font-bold"
            style={{ color: headingColor, fontWeight: headingWeight }}
          >
            {hero.heading || "Willkommen bei FR-Sieg"}
          </h1>

          <p
            className="mt-4 max-w-3xl text-lg"
            style={{ color: bodyColor, fontWeight: bodyWeight }}
          >
            {hero.subheading || "Hier entsteht die neue FR-Sieg Website."}
          </p>

          {hero.ctaLabel ? (
            <a
              href={hero.ctaHref || "#"}
              className="mt-6 inline-flex rounded-md px-4 py-2 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {hero.ctaLabel}
            </a>
          ) : null}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {panels.map((panel) => (
            <article
              key={panel.id}
              className="rounded-xl border p-5"
              style={{ borderColor: panel.color || primaryColor }}
            >
              {panel.imageAssetId ? (
                <Image
                  src={getMediaUrl(panel.imageAssetId) ?? ""}
                  alt={panel.title || "Panel Bild"}
                  width={960}
                  height={540}
                  className="mb-3 h-44 w-full rounded-md object-cover"
                  unoptimized
                />
              ) : null}

              <h3 className="text-xl" style={{ color: headingColor, fontWeight: headingWeight }}>
                {panel.title}
              </h3>
              <p className="mt-2" style={{ color: bodyColor, fontWeight: bodyWeight }}>
                {panel.text}
              </p>

              {panel.linkLabel ? (
                <a className="mt-3 inline-block underline" href={panel.linkHref || "#"}>
                  {panel.linkLabel}
                </a>
              ) : null}
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-xl border p-5">
          <h2 className="text-2xl" style={{ color: headingColor, fontWeight: headingWeight }}>
            Partner
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {partners.map((partner) => (
              <div key={partner.id} className="rounded-lg border p-3 text-center">
                {partner.logoAssetId ? (
                  <Image
                    src={getMediaUrl(partner.logoAssetId) ?? ""}
                    alt={partner.name}
                    width={96}
                    height={96}
                    className="mx-auto mb-2 h-16 w-16 object-contain"
                    unoptimized
                  />
                ) : null}
                <div
                  className="text-sm"
                  style={{ color: bodyColor, fontWeight: bodyWeight }}
                >
                  {partner.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {canEdit ? (
        <>
          <button
            type="button"
            onClick={() => {
              const next = !isEditing;
              setIsEditing(next);
              if (next) {
                setEditorMode("simple");
                loadMedia().catch((reason) => {
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : "Medien konnten nicht geladen werden.",
                  );
                });
              }
            }}
            className="fixed right-4 top-4 z-40 rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            {isEditing ? "Editor schließen" : "Oma-Modus Editor"}
          </button>

          {isEditing ? (
            <aside className="fixed bottom-0 right-0 top-16 z-30 w-full max-w-md overflow-y-auto border-l bg-white p-4 shadow-2xl">
              <h2 className="mb-1 text-lg font-bold">Live bearbeiten</h2>
              <p className="mb-3 text-xs text-neutral-600">
                Reihenfolge: Text ändern → optional Bild hochladen/zuweisen → Speichern.
              </p>
              <p className="mb-3 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-900">
                <strong>Tipp:</strong> Im einfachen Modus kannst du nichts kaputt machen – ändere nur die wichtigsten Felder.
              </p>

              <div className="mb-3 grid grid-cols-2 gap-2" role="tablist" aria-label="Editor Modus">
                <button
                  type="button"
                  onClick={() => setEditorMode("simple")}
                  className={`rounded border px-3 py-2 text-sm ${editorMode === "simple" ? "bg-black text-white" : "bg-white"}`}
                >
                  Einfacher Modus
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("advanced")}
                  className={`rounded border px-3 py-2 text-sm ${editorMode === "advanced" ? "bg-black text-white" : "bg-white"}`}
                >
                  Erweiterter Modus
                </button>
              </div>

              <div className="space-y-3 pb-28">
                <h3 className="text-sm font-semibold">Wichtigste Inhalte</h3>
                <label className="block text-sm">
                  <span>Seitenname</span>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  <span>Sichtbarkeit auf der Website</span>
                  <select
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as "draft" | "published")
                    }
                  >
                    <option value="draft">Entwurf (noch nicht sichtbar)</option>
                    <option value="published">Veröffentlicht (sichtbar)</option>
                  </select>
                </label>

                <h3 className="pt-2 text-sm font-semibold">Startbereich oben</h3>

                <label className="block text-sm">
                  <span>Große Überschrift oben</span>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={hero.heading || ""}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        hero: { ...(prev.hero ?? {}), heading: event.target.value },
                      }))
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span>Einleitungstext darunter</span>
                  <textarea
                    className="mt-1 w-full rounded border px-3 py-2"
                    rows={3}
                    value={hero.subheading || ""}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        hero: { ...(prev.hero ?? {}), subheading: event.target.value },
                      }))
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span>Knopf-Text</span>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={hero.ctaLabel || ""}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        hero: { ...(prev.hero ?? {}), ctaLabel: event.target.value },
                      }))
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span>Knopf-Link (Webadresse)</span>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={hero.ctaHref || ""}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        hero: { ...(prev.hero ?? {}), ctaHref: event.target.value },
                      }))
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span>Bild für den Startbereich</span>
                  <select
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={hero.backgroundAssetId ?? ""}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        hero: {
                          ...(prev.hero ?? {}),
                          backgroundAssetId: event.target.value || null,
                        },
                      }))
                    }
                  >
                    <option value="">Kein Bild</option>
                    {imageAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.fileName}
                      </option>
                    ))}
                  </select>
                </label>

                {editorMode === "advanced" ? (
                  <>
                <h3 className="pt-2 text-sm font-semibold">Design (Farben & Schrift)</h3>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm">
                    <span>Primärfarbe</span>
                    <input
                      type="color"
                      className="mt-1 h-10 w-full rounded border"
                      value={primaryColor}
                      onChange={(event) =>
                        setContent((prev) => ({
                          ...prev,
                          colors: { ...(prev.colors ?? {}), primary: event.target.value },
                        }))
                      }
                    />
                  </label>

                  <label className="text-sm">
                    <span>Panel-Hintergrund</span>
                    <input
                      type="color"
                      className="mt-1 h-10 w-full rounded border"
                      value={surfaceColor}
                      onChange={(event) =>
                        setContent((prev) => ({
                          ...prev,
                          colors: { ...(prev.colors ?? {}), surface: event.target.value },
                        }))
                      }
                    />
                  </label>

                  <label className="text-sm">
                    <span>Überschrift-Farbe</span>
                    <input
                      type="color"
                      className="mt-1 h-10 w-full rounded border"
                      value={headingColor}
                      onChange={(event) =>
                        setContent((prev) => ({
                          ...prev,
                          colors: { ...(prev.colors ?? {}), heading: event.target.value },
                        }))
                      }
                    />
                  </label>

                  <label className="text-sm">
                    <span>Text-Farbe</span>
                    <input
                      type="color"
                      className="mt-1 h-10 w-full rounded border"
                      value={bodyColor}
                      onChange={(event) =>
                        setContent((prev) => ({
                          ...prev,
                          colors: { ...(prev.colors ?? {}), body: event.target.value },
                        }))
                      }
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span>Schriftart</span>
                  <select
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={fontFamily}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        typography: {
                          ...(prev.typography ?? {}),
                          fontFamily: event.target.value,
                        },
                      }))
                    }
                  >
                    {fontFamilyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm">
                    <span>Headline Stärke</span>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2"
                      value={headingWeight}
                      onChange={(event) =>
                        setContent((prev) => ({
                          ...prev,
                          typography: {
                            ...(prev.typography ?? {}),
                            headingWeight: event.target.value,
                          },
                        }))
                      }
                    >
                      {fontWeightOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span>Text Stärke</span>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2"
                      value={bodyWeight}
                      onChange={(event) =>
                        setContent((prev) => ({
                          ...prev,
                          typography: {
                            ...(prev.typography ?? {}),
                            bodyWeight: event.target.value,
                          },
                        }))
                      }
                    >
                      {fontWeightOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <h3 className="pt-2 text-sm font-semibold">Panels / Inhaltsblöcke</h3>

                <div className="rounded border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="text-sm">Panels</strong>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          panels: [
                            ...(prev.panels ?? []),
                            {
                              id: uid("panel"),
                              title: "",
                              text: "",
                              color: primaryColor,
                              linkLabel: "",
                              linkHref: "",
                              imageAssetId: null,
                            },
                          ],
                        }))
                      }
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(content.panels ?? []).map((panel) => (
                      <div key={panel.id} className="space-y-2 rounded border p-2">
                        <input
                          className="w-full rounded border px-2 py-1 text-sm"
                          placeholder="Titel"
                          value={panel.title}
                          onChange={(event) =>
                            setContent((prev) => ({
                              ...prev,
                              panels: (prev.panels ?? []).map((item) =>
                                item.id === panel.id
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <textarea
                          className="w-full rounded border px-2 py-1 text-sm"
                          rows={2}
                          placeholder="Text"
                          value={panel.text}
                          onChange={(event) =>
                            setContent((prev) => ({
                              ...prev,
                              panels: (prev.panels ?? []).map((item) =>
                                item.id === panel.id
                                  ? { ...item, text: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />

                        <select
                          className="w-full rounded border px-2 py-1 text-sm"
                          value={panel.imageAssetId ?? ""}
                          onChange={(event) =>
                            setContent((prev) => ({
                              ...prev,
                              panels: (prev.panels ?? []).map((item) =>
                                item.id === panel.id
                                  ? {
                                      ...item,
                                      imageAssetId: event.target.value || null,
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="">Kein Bild</option>
                          {imageAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.fileName}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="text-xs text-red-700"
                          onClick={() =>
                            setContent((prev) => ({
                              ...prev,
                              panels: (prev.panels ?? []).filter(
                                (item) => item.id !== panel.id,
                              ),
                            }))
                          }
                        >
                          Entfernen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <h3 className="pt-2 text-sm font-semibold">Partner-Bereich</h3>

                <div className="rounded border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="text-sm">Partner</strong>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          partners: [
                            ...(prev.partners ?? []),
                            {
                              id: uid("partner"),
                              name: "",
                              url: "",
                              logoAssetId: null,
                            },
                          ],
                        }))
                      }
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(content.partners ?? []).map((partner) => (
                      <div key={partner.id} className="space-y-2 rounded border p-2">
                        <input
                          className="w-full rounded border px-2 py-1 text-sm"
                          placeholder="Name"
                          value={partner.name}
                          onChange={(event) =>
                            setContent((prev) => ({
                              ...prev,
                              partners: (prev.partners ?? []).map((item) =>
                                item.id === partner.id
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />

                        <input
                          className="w-full rounded border px-2 py-1 text-sm"
                          placeholder="URL"
                          value={partner.url || ""}
                          onChange={(event) =>
                            setContent((prev) => ({
                              ...prev,
                              partners: (prev.partners ?? []).map((item) =>
                                item.id === partner.id
                                  ? { ...item, url: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />

                        <select
                          className="w-full rounded border px-2 py-1 text-sm"
                          value={partner.logoAssetId ?? ""}
                          onChange={(event) =>
                            setContent((prev) => ({
                              ...prev,
                              partners: (prev.partners ?? []).map((item) =>
                                item.id === partner.id
                                  ? {
                                      ...item,
                                      logoAssetId: event.target.value || null,
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="">Kein Logo</option>
                          {imageAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.fileName}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="text-xs text-red-700"
                          onClick={() =>
                            setContent((prev) => ({
                              ...prev,
                              partners: (prev.partners ?? []).filter(
                                (item) => item.id !== partner.id,
                              ),
                            }))
                          }
                        >
                          Entfernen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                  </>
                ) : null}

                <h3 className="pt-2 text-sm font-semibold">Bilder hochladen</h3>

                <div className="rounded border p-3">
                  <strong className="mb-1 block text-sm">Direkter Bildupload</strong>
                  <p className="mb-2 text-xs text-neutral-600">Nach dem Upload kannst du das Bild bei Hero, Panels oder Partnern auswählen.</p>
                  <input
                    type="file"
                    className="w-full text-sm"
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    className="mt-2 rounded border px-3 py-1 text-sm"
                    onClick={uploadMedia}
                    disabled={isSaving}
                  >
                    Upload
                  </button>
                </div>

                <div className="fixed bottom-0 right-0 z-40 w-full max-w-md border-t bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-black px-3 py-2 text-sm text-white"
                      onClick={savePage}
                      disabled={isSaving}
                    >
                      {isSaving ? "Speichert..." : "Speichern"}
                    </button>

                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm"
                      onClick={discardChanges}
                      disabled={isSaving}
                    >
                      Änderungen verwerfen
                    </button>

                    <Link href="/admin" className="rounded border px-3 py-2 text-sm">
                      Voller Admin
                    </Link>
                  </div>

                  {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}
                  {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
                </div>
              </div>
            </aside>
          ) : null}
        </>
      ) : (
        <Link
          href="/admin/login"
          className="fixed right-4 top-4 rounded-md border bg-white px-4 py-2 text-sm"
        >
          Admin Login
        </Link>
      )}
    </div>
  );
}
