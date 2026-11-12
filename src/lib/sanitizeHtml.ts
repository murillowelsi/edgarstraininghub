import DOMPurify from "dompurify";

// Links from the Quill editor open in a new tab; keep that, but never let the
// new page reach back through window.opener.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Cleans rich text (blog posts) before it goes into `dangerouslySetInnerHTML`:
 * keeps the formatting the editor produces (headings, lists, links, images,
 * code, quotes, hr) and drops scripts, event handlers and `javascript:` URLs.
 */
export const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ["target"] });
