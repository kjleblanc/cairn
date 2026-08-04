import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  EvidenceAlbum as EvidenceAlbumData,
  EvidenceAlbumEntry,
  EvidenceImage,
} from "../../shared/ipc";
import { cairn } from "../api";
import { Overlay } from "./Overlay";

type LoadedImage = {
  metadata: EvidenceImage;
  dataUrl: string;
};

function isPngDataUrl(value: string): boolean {
  return value.startsWith("data:image/png;base64,");
}

/**
 * The card accepts only the two Task 173 still roles from an entry main has
 * already marked trusted. `moment` belongs to later capture work and legacy
 * entries belong only in the album. Role order makes one-image degradation
 * deterministic without letting a malformed pair object choose a different
 * picture.
 */
function cardImageMetadata(entry: EvidenceAlbumEntry): EvidenceImage[] {
  if (!entry.trusted) return [];
  const trusted = entry.images.filter((image) => image.trusted);
  if (entry.pair) {
    const before = trusted.find((image) => image.id === entry.pair?.beforeId && image.role === "before");
    const after = trusted.find((image) => image.id === entry.pair?.afterId && image.role === "after");
    return [before, after].filter((image): image is EvidenceImage => image !== undefined);
  }
  const before = trusted.find((image) => image.role === "before");
  const after = trusted.find((image) => image.role === "after");
  return [before, after].filter((image): image is EvidenceImage => image !== undefined);
}

async function loadImages(dir: string, images: readonly EvidenceImage[]): Promise<LoadedImage[]> {
  const loaded = await Promise.all(images.map(async (metadata): Promise<LoadedImage | null> => {
    try {
      const result = await cairn.evidenceImage(dir, metadata.id);
      if (!result.ok || result.value.id !== metadata.id || !isPngDataUrl(result.value.dataUrl)) return null;
      return { metadata, dataUrl: result.value.dataUrl };
    } catch {
      return null;
    }
  }));
  return loaded.filter((image): image is LoadedImage => image !== null);
}

function EvidenceFigure({ image }: { image: LoadedImage }) {
  return (
    <figure className="result-evidence-figure">
      <img src={image.dataUrl} alt={image.metadata.label} loading="lazy" decoding="async"
        width={image.metadata.width} height={image.metadata.height} />
      <figcaption>{image.metadata.label}</figcaption>
    </figure>
  );
}

/**
 * Album pictures ask main for bytes only when their slot approaches the
 * viewport. Metadata alone never becomes an image URL, and no local path ever
 * crosses this component.
 */
function LazyAlbumFigure({ dir, image }: { dir: string; image: EvidenceImage }) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const [requested, setRequested] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (requested) return;
    const slot = slotRef.current;
    if (!slot || typeof IntersectionObserver === "undefined") {
      setRequested(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setRequested(true);
      observer.disconnect();
    }, { rootMargin: "180px" });
    observer.observe(slot);
    return () => observer.disconnect();
  }, [requested]);

  useEffect(() => {
    if (!requested) return;
    let current = true;
    void cairn.evidenceImage(dir, image.id).then((result) => {
      if (!current) return;
      if (!result.ok || result.value.id !== image.id || !isPngDataUrl(result.value.dataUrl)) {
        setFailed(true);
        return;
      }
      setSource(result.value.dataUrl);
    }).catch(() => {
      if (current) setFailed(true);
    });
    return () => { current = false; };
  }, [dir, image.id, requested]);

  if (failed) return null;
  return (
    <div ref={slotRef} className="evidence-album-image-slot"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}>
      {source ? (
        <figure className="evidence-album-figure">
          <img src={source} alt={image.label} loading="lazy" decoding="async"
            width={image.width} height={image.height} onError={() => setFailed(true)} />
          <figcaption>{image.label}</figcaption>
        </figure>
      ) : null}
    </div>
  );
}

function AlbumEntryView({ dir, entry, selected }: {
  dir: string;
  entry: EvidenceAlbumEntry;
  selected: boolean;
}) {
  return (
    <section className={`evidence-album-entry${selected ? " evidence-album-entry-selected" : ""}`}
      aria-current={selected ? "true" : undefined}>
      <div className="evidence-album-entry-heading">
        <h4>{entry.title}</h4>
        {selected ? <span className="evidence-album-current">this run</span> : null}
        {entry.taskNumber !== null ? <span className="small muted">Task {String(entry.taskNumber).padStart(3, "0")}</span> : null}
      </div>
      {entry.caption ? <p className="evidence-album-caption">{entry.caption}</p> : null}
      <div className={`evidence-album-images${entry.images.length === 1 ? " evidence-album-images-single" : ""}`}>
        {entry.images.map((image) => <LazyAlbumFigure key={image.id} dir={dir} image={image} />)}
      </div>
    </section>
  );
}

function EntryGroup({ title, note, dir, entries, selectedRunId }: {
  title: string;
  note?: string;
  dir: string;
  entries: readonly EvidenceAlbumEntry[];
  selectedRunId: string | null;
}) {
  if (entries.length === 0) return null;
  const headingId = `evidence-group-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="evidence-album-group" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      {note ? <p className="small muted evidence-album-note">{note}</p> : null}
      {entries.map((entry, index) => (
        <AlbumEntryView key={entry.runId ?? `${entry.title}-${index}`} dir={dir} entry={entry}
          selected={entry.runId !== null && entry.runId === selectedRunId} />
      ))}
    </section>
  );
}

function EvidenceAlbumOverlay({ dir, selectedRunId, onClose }: {
  dir: string;
  selectedRunId: string;
  onClose: () => void;
}) {
  const requestKey = `${dir}\u001f${selectedRunId}`;
  const [loaded, setLoaded] = useState<{ key: string; album: EvidenceAlbumData } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [olderLoaded, setOlderLoaded] = useState(false);

  useEffect(() => {
    // Unlike the shell's overlays, this one originates deep inside Chat. Move
    // it beside the shell base (the portal below), then apply the shell's same
    // keyboard and accessibility isolation while it is open. Preserve any
    // pre-existing state so cleanup cannot reopen a different overlay.
    const base = document.querySelector<HTMLElement>(".shell-base");
    if (!base) return;
    const wasInert = base.hasAttribute("inert");
    const previousAriaHidden = base.getAttribute("aria-hidden");
    base.setAttribute("inert", "");
    base.setAttribute("aria-hidden", "true");
    return () => {
      if (!wasInert) base.removeAttribute("inert");
      if (previousAriaHidden === null) base.removeAttribute("aria-hidden");
      else base.setAttribute("aria-hidden", previousAriaHidden);
    };
  }, []);

  useEffect(() => {
    let current = true;
    setOlderError(false);
    setOlderLoaded(false);
    setLoadingOlder(false);
    void cairn.evidenceAlbum(dir, selectedRunId).then((result) => {
      if (!current) return;
      if (!result.ok) {
        setFailedKey(requestKey);
        return;
      }
      setLoaded({ key: requestKey, album: result.value });
    }).catch(() => {
      if (current) setFailedKey(requestKey);
    });
    return () => { current = false; };
  }, [dir, requestKey, selectedRunId]);

  const album = loaded?.key === requestKey ? loaded.album : null;
  const failed = failedKey === requestKey;
  const selected = album?.selectedRunId === selectedRunId
    ? album.entries.find((entry) => entry.trusted && entry.runId === selectedRunId && entry.images.length > 0) ?? null
    : null;
  const earlierTrusted = album?.entries.filter((entry) =>
    entry.trusted && entry.runId !== selectedRunId && entry.images.length > 0) ?? [];
  const legacy = album?.entries.filter((entry) => !entry.trusted && entry.images.length > 0) ?? [];

  const loadOlder = useCallback(() => {
    if (!album?.nextCursor || loadingOlder) return;
    const cursor = album.nextCursor;
    setOlderError(false);
    setLoadingOlder(true);
    void cairn.evidenceAlbum(dir, selectedRunId, cursor).then((result) => {
      if (!result.ok) {
        setOlderError(true);
        return;
      }
      setOlderLoaded(true);
      setLoaded((current) => {
        if (!current || current.key !== requestKey) return current;
        const seen = new Set(current.album.entries.map((entry) => entry.runId ?? `legacy:${entry.title}`));
        const additions = result.value.entries.filter((entry) => !seen.has(entry.runId ?? `legacy:${entry.title}`));
        return {
          key: requestKey,
          album: {
            selectedRunId: current.album.selectedRunId,
            entries: [...current.album.entries, ...additions],
            nextCursor: result.value.nextCursor,
          },
        };
      });
    }).catch(() => setOlderError(true)).finally(() => setLoadingOlder(false));
  }, [album?.nextCursor, dir, loadingOlder, requestKey, selectedRunId]);

  return createPortal((
    <Overlay label="local picture album" onClose={onClose}>
      <div className="evidence-album">
        <p className="card-title">local album</p>
        <h2>Pictures Cairn kept on this computer</h2>
        <p className="evidence-album-intro">Checked pictures stay tied to the run that made them. Older review shots remain available below, clearly separated.</p>
        {!album && !failed ? <p role="status" className="muted">Opening the album…</p> : null}
        {failed ? <p role="status">Cairn couldn&apos;t open these local pictures.</p> : null}
        {album ? (
          <>
            {!selected ? <p role="status">The pictures for this result are no longer available.</p> : null}
            <EntryGroup title="This run" dir={dir} entries={selected ? [selected] : []}
              selectedRunId={album.selectedRunId} />
            <EntryGroup title={selected ? "Earlier checked pictures" : "Other checked pictures"}
              dir={dir} entries={earlierTrusted}
              selectedRunId={album.selectedRunId} />
            <EntryGroup title="Past review shots" dir={dir} entries={legacy}
              selectedRunId={album.selectedRunId}
              note="These older pictures were saved for visual review. They are not checked evidence for this run." />
            {olderError ? <p role="status">Cairn couldn&apos;t open the older pictures.</p> : null}
            {olderLoaded && !olderError ? (
              <p role="status" className="small muted">{album.nextCursor
                ? "Older pictures opened."
                : "All older pictures are open."}</p>
            ) : null}
            {album.nextCursor || loadingOlder || olderLoaded ? (
              <button type="button" className="pill pill-quiet evidence-album-older"
                aria-disabled={loadingOlder || !album.nextCursor} onClick={loadOlder}>
                {loadingOlder
                  ? "Opening older pictures..."
                  : album.nextCursor ? "Load older pictures" : "All older pictures are open"}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </Overlay>
  ), document.body);
}

/**
 * The first child of a result card. It renders nothing until main returns an
 * exact trusted entry for this card's opaque run ID and at least one PNG can
 * be read back through the validated image seam. One failed half degrades to
 * one honest full-width figure; two failures leave no section or control.
 */
export function ResultEvidence({ dir, runId }: { dir: string; runId?: string | null }) {
  const evidenceKey = runId ? `${dir}\u001f${runId}` : null;
  const [loaded, setLoaded] = useState<{ key: string; images: LoadedImage[] } | null>(null);
  const [albumOpen, setAlbumOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!runId || !evidenceKey) return;
    let current = true;
    void cairn.evidenceAlbum(dir, runId).then(async (result) => {
      if (!current || !result.ok || result.value.selectedRunId !== runId) return;
      const entry = result.value.entries.find((candidate) => candidate.trusted && candidate.runId === runId);
      if (!entry) return;
      const images = await loadImages(dir, cardImageMetadata(entry));
      if (current) setLoaded({ key: evidenceKey, images });
    }).catch(() => {
      if (current) setLoaded({ key: evidenceKey, images: [] });
    });
    return () => { current = false; };
  }, [dir, evidenceKey, runId]);

  const closeAlbum = useCallback(() => {
    setAlbumOpen(false);
    window.requestAnimationFrame(() => openButtonRef.current?.focus());
  }, []);

  const images = evidenceKey !== null && loaded?.key === evidenceKey ? loaded.images : [];
  if (!runId || images.length === 0) return null;
  const heading = images.length === 2
    ? "Before and after"
    : images[0].metadata.role === "before"
      ? "Before the worker started"
      : "After the task settled";

  return (
    <section className="result-evidence" aria-label="Pictures checked by Cairn">
      <div className="result-evidence-heading">
        <div>
          <p className="card-title">what Cairn saw</p>
          <h2>{heading}</h2>
        </div>
        <span className="result-evidence-local">kept on this computer</span>
      </div>
      <div className={`result-evidence-grid${images.length === 1 ? " result-evidence-grid-single" : ""}`}>
        {images.map((image) => <EvidenceFigure key={image.metadata.id} image={image} />)}
      </div>
      <button ref={openButtonRef} type="button" className="pill pill-quiet result-evidence-open"
        onClick={() => setAlbumOpen(true)}>Open the local album</button>
      {albumOpen ? <EvidenceAlbumOverlay dir={dir} selectedRunId={runId} onClose={closeAlbum} /> : null}
    </section>
  );
}
