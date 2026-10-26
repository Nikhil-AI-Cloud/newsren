const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", copy: "©", reg: "®",
  trade: "™", eacute: "é", egrave: "è", uuml: "ü", ouml: "ö", auml: "ä", aacute: "á",
  oacute: "ó", iacute: "í", ntilde: "ñ", ccedil: "ç", bull: "•", middot: "·",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return " ";
      try {
        return String.fromCodePoint(code);
      } catch {
        return " ";
      }
    }
    return NAMED[body.toLowerCase()] ?? m;
  });
}

/**
 * Converts untrusted feed HTML to plain text. The result is rendered only as
 * React text nodes, so no markup from a feed is ever interpreted.
 */
export function htmlToText(input: string): string {
  let s = input
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|iframe|object|embed|noscript)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<\/?(p|div|br|li|ul|ol|h[1-6]|blockquote|tr|table|section|article|figure|figcaption)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  // Decode twice to handle double-escaped feeds (&amp;lt;p&amp;gt;), then strip again.
  s = decodeEntities(s);
  if (/<[a-z/][^>]*>/i.test(s)) s = s.replace(/<[^>]*>/g, " ");
  s = decodeEntities(s);
  return s
    // Remove control characters, then collapse whitespace.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Removes common feed boilerplate such as WordPress "The post … appeared first on …". */
export function stripBoilerplate(text: string): string {
  return text
    .replace(/\s*The post .{0,300}? appeared first on .{0,120}$/i, "")
    .replace(/\s*(Read more|Continue reading)[^.]{0,40}$/i, "")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

export function slugify(title: string, max = 60): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, max).replace(/-+$/, "") || "story";
}
