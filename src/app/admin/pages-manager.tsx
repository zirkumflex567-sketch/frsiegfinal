"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ContentPage = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  updatedAt: string;
};

type MediaAsset = {
  id: string;
  fileName: string;
  fileUrl: string;
  altText: string | null;
  mimeType: string;
};

type PanelDraft = {
  id: string;
  title: string;
  text: string;
  color: string;
  linkLabel: string;
  linkHref: string;
  imageAssetId: string | null;
};

type PartnerDraft = {
  id: string;
  name: string;
  url: string;
  logoAssetId: string | null;
};

type PageDetailsResponse = {
  page?: {
    id: string;
    title: string;
    slug: string;
    status: "draft" | "published";
    content?: {
      hero?: {
        heading?: string;
        subheading?: string;
        ctaLabel?: string;
        ctaHref?: string;
        backgroundAssetId?: string | null;
      };
      typography?: {
        fontFamily?: string;
        headingWeight?: string;
        bodyWeight?: string;
      };
      colors?: Record<string, string>;
      links?: Record<string, string>;
      panels?: PanelDraft[];
      partners?: PartnerDraft[];
    };
  };
  error?: string;
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
    const errorValue = (payload as { error?: unknown }).error;

    if (typeof errorValue === "string" && errorValue.trim().length > 0) {
      return errorValue;
    }
  }

  return fallback;
}

function makeLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blankPanel(): PanelDraft {
  return {
    id: makeLocalId("panel"),
    title: "",
    text: "",
    color: "#2563eb",
    linkLabel: "",
    linkHref: "",
    imageAssetId: null,
  };
}

function blankPartner(): PartnerDraft {
  return {
    id: makeLocalId("partner"),
    name: "",
    url: "",
    logoAssetId: null,
  };
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

export function PagesManager() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [heroHeading, setHeroHeading] = useState("");
  const [heroSubheading, setHeroSubheading] = useState("");
  const [heroCtaLabel, setHeroCtaLabel] = useState("");
  const [heroCtaHref, setHeroCtaHref] = useState("");
  const [heroBackgroundAssetId, setHeroBackgroundAssetId] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [surfaceColor, setSurfaceColor] = useState("#f5f5f5");
  const [headingColor, setHeadingColor] = useState("#1f2937");
  const [bodyColor, setBodyColor] = useState("#374151");

  const [fontFamily, setFontFamily] = useState("Inter, system-ui, sans-serif");
  const [headingWeight, setHeadingWeight] = useState("700");
  const [bodyWeight, setBodyWeight] = useState("400");

  const [panels, setPanels] = useState<PanelDraft[]>([]);
  const [partners, setPartners] = useState<PartnerDraft[]>([]);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAltText, setUploadAltText] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedPage = useMemo(
    () => pages.find((item) => item.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  );

  const imageAssets = useMemo(
    () => media.filter((item) => item.mimeType.startsWith("image/")),
    [media],
  );

  async function loadPages() {
    const response = await fetch("/api/admin/pages", { cache: "no-store" });
    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(resolveApiErrorMessage(data, "Seiten konnten nicht geladen werden."));
    }

    const pagesPayload = data as { pages?: ContentPage[] } | null;
    setPages(Array.isArray(pagesPayload?.pages) ? pagesPayload.pages : []);
  }

  async function loadMedia() {
    const response = await fetch("/api/admin/media", { cache: "no-store" });
    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(resolveApiErrorMessage(data, "Medien konnten nicht geladen werden."));
    }

    const mediaPayload = data as { media?: MediaAsset[] } | null;
    setMedia(Array.isArray(mediaPayload?.media) ? mediaPayload.media : []);
  }

  async function loadPageDetails(pageId: string) {
    const response = await fetch(`/api/admin/pages/${pageId}`, { cache: "no-store" });
    const data = await parseJsonSafely(response);

    if (!response.ok || !data || typeof data !== "object" || !("page" in data) || !(data as PageDetailsResponse).page) {
      throw new Error(resolveApiErrorMessage(data, "Seite konnte nicht geladen werden."));
    }

    const pageData = (data as PageDetailsResponse).page;
    if (!pageData) {
      throw new Error("Seite konnte nicht geladen werden.");
    }

    const content = pageData.content ?? {};

    setTitle(pageData.title);
    setSlug(pageData.slug);
    setStatus(pageData.status);

    setHeroHeading(content.hero?.heading ?? "");
    setHeroSubheading(content.hero?.subheading ?? "");
    setHeroCtaLabel(content.hero?.ctaLabel ?? "");
    setHeroCtaHref(content.hero?.ctaHref ?? "");
    setHeroBackgroundAssetId(content.hero?.backgroundAssetId ?? null);

    setPrimaryColor(content.colors?.primary ?? "#2563eb");
    setSurfaceColor(content.colors?.surface ?? "#f5f5f5");
    setHeadingColor(content.colors?.heading ?? "#1f2937");
    setBodyColor(content.colors?.body ?? "#374151");

    setFontFamily(content.typography?.fontFamily ?? "Inter, system-ui, sans-serif");
    setHeadingWeight(content.typography?.headingWeight ?? "700");
    setBodyWeight(content.typography?.bodyWeight ?? "400");

    setPanels(
      (content.panels ?? []).map((panel) => ({
        id: panel.id || makeLocalId("panel"),
        title: panel.title ?? "",
        text: panel.text ?? "",
        color: panel.color ?? "#2563eb",
        linkLabel: panel.linkLabel ?? "",
        linkHref: panel.linkHref ?? "",
        imageAssetId: panel.imageAssetId ?? null,
      })),
    );

    setPartners(
      (content.partners ?? []).map((partner) => ({
        id: partner.id || makeLocalId("partner"),
        name: partner.name ?? "",
        url: partner.url ?? "",
        logoAssetId: partner.logoAssetId ?? null,
      })),
    );
  }

  function resetForm() {
    setSelectedPageId(null);
    setTitle("");
    setSlug("");
    setStatus("draft");

    setHeroHeading("");
    setHeroSubheading("");
    setHeroCtaLabel("");
    setHeroCtaHref("");
    setHeroBackgroundAssetId(null);

    setPrimaryColor("#2563eb");
    setSurfaceColor("#f5f5f5");
    setHeadingColor("#1f2937");
    setBodyColor("#374151");

    setFontFamily("Inter, system-ui, sans-serif");
    setHeadingWeight("700");
    setBodyWeight("400");

    setPanels([]);
    setPartners([]);

    setMessage(null);
    setError(null);
  }

  useEffect(() => {
    Promise.all([loadPages(), loadMedia()]).catch((reason) => {
      const message = reason instanceof Error ? reason.message : "Unbekannter Fehler";
      setError(message);
    });
  }, []);

  useEffect(() => {
    if (selectedPageId || pages.length === 0) return;

    const preferred = pages.find((page) => page.slug === "home") ?? pages[0];
    if (!preferred) return;

    setSelectedPageId(preferred.id);
    loadPageDetails(preferred.id).catch((reason) => {
      const message = reason instanceof Error ? reason.message : "Unbekannter Fehler";
      setError(message);
    });
  }, [pages, selectedPageId]);

  function buildPayload() {
    return {
      slug,
      title,
      status,
      content: {
        hero: {
          heading: heroHeading,
          subheading: heroSubheading,
          ctaLabel: heroCtaLabel,
          ctaHref: heroCtaHref,
          backgroundAssetId: heroBackgroundAssetId,
        },
        typography: {
          fontFamily,
          headingWeight,
          bodyWeight,
        },
        colors: {
          primary: primaryColor,
          surface: surfaceColor,
          heading: headingColor,
          body: bodyColor,
        },
        links: {
          primaryCta: heroCtaHref,
        },
        panels,
        partners,
      },
    };
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = await parseJsonSafely(response);
      const page =
        data && typeof data === "object" && "page" in data
          ? (data as { page?: ContentPage }).page
          : undefined;

      if (!response.ok || !page) {
        throw new Error(resolveApiErrorMessage(data, "Erstellen fehlgeschlagen."));
      }

      await loadPages();
      setSelectedPageId(page.id);
      await loadPageDetails(page.id);
      setMessage("Seite angelegt.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!selectedPageId) {
      await handleCreate(event);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/pages/${selectedPageId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(data, "Speichern fehlgeschlagen."));
      }

      await loadPages();
      setMessage("Änderungen gespeichert.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePage() {
    if (!selectedPageId) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/pages/${selectedPageId}`, {
        method: "DELETE",
      });

      const data = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(data, "Löschen fehlgeschlagen."));
      }

      await loadPages();
      resetForm();
      setMessage("Seite gelöscht.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadMedia() {
    if (!uploadFile) {
      setError("Bitte Datei wählen.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", uploadFile);
      formData.set("altText", uploadAltText);

      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const data = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(data, "Upload fehlgeschlagen."));
      }

      await loadMedia();
      setUploadFile(null);
      setUploadAltText("");
      setMessage("Datei hochgeladen.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMedia(assetId: string) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/media/${assetId}`, {
        method: "DELETE",
      });

      const data = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(data, "Asset konnte nicht gelöscht werden."));
      }

      await loadMedia();
      setMessage("Asset gelöscht.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function selectPage(pageId: string) {
    setSelectedPageId(pageId);
    setError(null);
    setMessage(null);

    try {
      await loadPageDetails(pageId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unbekannter Fehler");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[300px,1fr,340px]">
      <aside className="rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Seiten</h2>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-md border px-2 py-1 text-xs"
          >
            Neu
          </button>
        </div>
        <ul className="space-y-2">
          {pages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => selectPage(page.id)}
                className={`w-full rounded-md border px-3 py-2 text-left ${selectedPageId === page.id ? "border-black" : "border-neutral-200"}`}
              >
                <div className="text-sm font-medium">{page.title}</div>
                <div className="text-xs text-neutral-500">
                  /{page.slug} · {page.status}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="rounded-xl border p-6">
        <h2 className="mb-1 text-xl font-semibold">Oma-Modus Seite bearbeiten</h2>
        <p className="mb-5 text-sm text-neutral-600">
          Texte, Farben, Panels, Partner und Bilder in einem Formular.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Titel</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Slug</span>
              <input
                value={slug}
                onChange={(event) =>
                  setSlug(event.target.value.trim().toLowerCase().replace(/\s+/g, "-"))
                }
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "draft" | "published")
                }
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Hero Hintergrundbild</span>
              <select
                value={heroBackgroundAssetId ?? ""}
                onChange={(event) => setHeroBackgroundAssetId(event.target.value || null)}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="">Kein Bild</option>
                {imageAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.fileName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span>Hero Überschrift</span>
            <input
              value={heroHeading}
              onChange={(event) => setHeroHeading(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Hero Untertext</span>
            <textarea
              value={heroSubheading}
              onChange={(event) => setHeroSubheading(event.target.value)}
              className="w-full rounded-md border px-3 py-2"
              rows={3}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>CTA Text</span>
              <input
                value={heroCtaLabel}
                onChange={(event) => setHeroCtaLabel(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>CTA Link</span>
              <input
                value={heroCtaHref}
                onChange={(event) => setHeroCtaHref(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Primärfarbe</span>
              <input
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="h-10 w-full rounded-md border px-1"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Panel-Hintergrund</span>
              <input
                type="color"
                value={surfaceColor}
                onChange={(event) => setSurfaceColor(event.target.value)}
                className="h-10 w-full rounded-md border px-1"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Überschrift-Farbe</span>
              <input
                type="color"
                value={headingColor}
                onChange={(event) => setHeadingColor(event.target.value)}
                className="h-10 w-full rounded-md border px-1"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Text-Farbe</span>
              <input
                type="color"
                value={bodyColor}
                onChange={(event) => setBodyColor(event.target.value)}
                className="h-10 w-full rounded-md border px-1"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm md:col-span-2">
              <span>Schriftart</span>
              <select
                value={fontFamily}
                onChange={(event) => setFontFamily(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              >
                {fontFamilyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Headline Stärke</span>
              <select
                value={headingWeight}
                onChange={(event) => setHeadingWeight(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              >
                {fontWeightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Text Stärke</span>
              <select
                value={bodyWeight}
                onChange={(event) => setBodyWeight(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              >
                {fontWeightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Panels</h3>
              <button
                type="button"
                onClick={() => setPanels((prev) => [...prev, blankPanel()])}
                className="rounded-md border px-2 py-1 text-xs"
              >
                + Panel
              </button>
            </div>

            {panels.length === 0 ? (
              <p className="text-xs text-neutral-500">Noch keine Panels angelegt.</p>
            ) : null}

            {panels.map((panel, index) => (
              <div key={panel.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <strong className="text-sm">Panel {index + 1}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      setPanels((prev) => prev.filter((item) => item.id !== panel.id))
                    }
                    className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700"
                  >
                    Entfernen
                  </button>
                </div>
                <input
                  value={panel.title}
                  onChange={(event) =>
                    setPanels((prev) =>
                      prev.map((item) =>
                        item.id === panel.id ? { ...item, title: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Panel Titel"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <textarea
                  value={panel.text}
                  onChange={(event) =>
                    setPanels((prev) =>
                      prev.map((item) =>
                        item.id === panel.id ? { ...item, text: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Panel Text"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={panel.linkLabel}
                    onChange={(event) =>
                      setPanels((prev) =>
                        prev.map((item) =>
                          item.id === panel.id ? { ...item, linkLabel: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Link Text"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <input
                    value={panel.linkHref}
                    onChange={(event) =>
                      setPanels((prev) =>
                        prev.map((item) =>
                          item.id === panel.id ? { ...item, linkHref: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Link URL"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    type="color"
                    value={panel.color || "#2563eb"}
                    onChange={(event) =>
                      setPanels((prev) =>
                        prev.map((item) =>
                          item.id === panel.id ? { ...item, color: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-md border px-1"
                  />
                  <select
                    value={panel.imageAssetId ?? ""}
                    onChange={(event) =>
                      setPanels((prev) =>
                        prev.map((item) =>
                          item.id === panel.id
                            ? { ...item, imageAssetId: event.target.value || null }
                            : item,
                        ),
                      )
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Kein Bild</option>
                    {imageAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.fileName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Partner</h3>
              <button
                type="button"
                onClick={() => setPartners((prev) => [...prev, blankPartner()])}
                className="rounded-md border px-2 py-1 text-xs"
              >
                + Partner
              </button>
            </div>

            {partners.length === 0 ? (
              <p className="text-xs text-neutral-500">Noch keine Partner angelegt.</p>
            ) : null}

            {partners.map((partner, index) => (
              <div key={partner.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <strong className="text-sm">Partner {index + 1}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      setPartners((prev) => prev.filter((item) => item.id !== partner.id))
                    }
                    className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700"
                  >
                    Entfernen
                  </button>
                </div>
                <input
                  value={partner.name}
                  onChange={(event) =>
                    setPartners((prev) =>
                      prev.map((item) =>
                        item.id === partner.id ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Partner Name"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <input
                  value={partner.url}
                  onChange={(event) =>
                    setPartners((prev) =>
                      prev.map((item) =>
                        item.id === partner.id ? { ...item, url: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Partner URL"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <select
                  value={partner.logoAssetId ?? ""}
                  onChange={(event) =>
                    setPartners((prev) =>
                      prev.map((item) =>
                        item.id === partner.id
                          ? { ...item, logoAssetId: event.target.value || null }
                          : item,
                      ),
                    )
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Kein Logo</option>
                  {imageAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.fileName}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {selectedPage ? "Speichern" : "Anlegen"}
            </button>

            {selectedPage ? (
              <button
                type="button"
                onClick={handleDeletePage}
                disabled={loading}
                className="rounded-md border border-red-300 px-4 py-2 text-red-700 disabled:opacity-60"
              >
                Seite löschen
              </button>
            ) : null}
          </div>
        </form>

        {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>

      <aside className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold">Medien</h2>

        <div className="space-y-2">
          <input
            type="file"
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          <input
            value={uploadAltText}
            onChange={(event) => setUploadAltText(event.target.value)}
            placeholder="Alt-Text (optional)"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleUploadMedia}
            disabled={loading}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            Datei hochladen
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {media.map((asset) => (
            <li key={asset.id} className="rounded-md border p-2">
              <div className="truncate text-xs font-medium">{asset.fileName}</div>
              <div className="truncate text-[11px] text-neutral-500">{asset.altText || "kein alt"}</div>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={asset.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline"
                >
                  Öffnen
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteMedia(asset.id)}
                  className="text-xs text-red-700"
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
