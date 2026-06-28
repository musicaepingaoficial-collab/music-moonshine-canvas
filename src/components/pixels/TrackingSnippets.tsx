import { useEffect } from "react";
import { usePublicTrackingSnippets, type TrackingSnippet } from "@/hooks/useTrackingSnippets";

const MARKER_ATTR = "data-tracking-snippet-id";

function cloneNodeForInjection(node: Element): Element | null {
  const tag = node.tagName.toLowerCase();
  if (tag === "script") {
    const src = node.getAttribute("src");
    const s = document.createElement("script");
    // copy attributes
    for (const attr of Array.from(node.attributes)) {
      try {
        s.setAttribute(attr.name, attr.value);
      } catch {
        /* ignore invalid attr */
      }
    }
    if (!src) {
      s.text = node.textContent ?? "";
    }
    return s;
  }
  // For noscript / meta / link / img etc. clone deep
  return node.cloneNode(true) as Element;
}

function injectSnippet(snippet: TrackingSnippet): Element[] {
  const injected: Element[] = [];
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(snippet.code, "text/html");
  } catch {
    return injected;
  }

  const target = snippet.placement === "body_start" ? document.body : document.head;
  if (!target) return injected;

  const candidates = [
    ...Array.from(doc.head?.children ?? []),
    ...Array.from(doc.body?.children ?? []),
  ];

  for (const el of candidates) {
    // Evita duplicar scripts externos já presentes no HTML estático (ex: SuperPixel no index.html)
    if (el.tagName.toLowerCase() === "script") {
      const src = el.getAttribute("src");
      if (src && document.querySelector(`script[src="${src}"]`)) continue;
    }
    const clone = cloneNodeForInjection(el);
    if (!clone) continue;
    clone.setAttribute(MARKER_ATTR, snippet.id);
    if (snippet.placement === "body_start") {
      target.prepend(clone);
    } else {
      target.appendChild(clone);
    }
    injected.push(clone);
  }
  return injected;
}



export function TrackingSnippets() {
  const { data: snippets } = usePublicTrackingSnippets();

  useEffect(() => {
    if (!snippets || snippets.length === 0) return;

    // Remove any previously injected nodes (avoids duplicates on refetch / StrictMode)
    document
      .querySelectorAll(`[${MARKER_ATTR}]`)
      .forEach((n) => n.remove());

    const injected: Element[] = [];
    for (const s of snippets) {
      // Idempotência: se já existe um nó com este snippet.id, não injeta de novo
      if (document.querySelector(`[${MARKER_ATTR}="${s.id}"]`)) continue;
      injected.push(...injectSnippet(s));
    }

    return () => {
      injected.forEach((n) => n.remove());
    };
  }, [snippets]);

  return null;
}
