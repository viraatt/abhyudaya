import { resolveAuthorName } from "../src/utils/authorHelper.js";

const SITE_URL = "https://www.abhyudayaclub.in";
const FALLBACK_IMAGE = `${SITE_URL}/abhyudaya-logo.png`;

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

export function normalizeBlogSlug(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getBlogDate(blog) {
  const value = blog?.publishedAt || blog?.publishedDate || blog?.createdAt || blog?.date;
  let date = null;
  if (value?.toDate) date = value.toDate();
  else if (typeof value === "string" || typeof value === "number") date = new Date(value);
  else if (value?.seconds) date = new Date(value.seconds * 1000);
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

export function getBlogAuthor(blog) {
  if (blog?.isAlumniContribution) return resolveAuthorName(blog.alumniAuthor, blog.author);
  const value = blog?.author;
  return typeof value === "string" && value.trim() ? value.trim() : "Abhyudaya Club";
}

export async function resolveBlogAuthor(db, blog) {
  if (!blog?.isAlumniContribution || !db) return blog;
  let authorUid = blog.authorUid || blog.authorId || blog.alumniAuthor?.uid || blog.createdBy;
  let name = resolveAuthorName(blog.alumniAuthor, blog.author, blog);

  if (name === "Abhyudaya Alumni" && blog.submissionId) {
    try {
      const submission = await db.collection("alumniSubmissions").doc(blog.submissionId).get();
      if (submission.exists) {
        const data = submission.data();
        authorUid ||= data.authorUid || data.authorId || data.uid || data.userId || data.createdBy || data.author?.uid;
        name = resolveAuthorName(data.author, data);
      }
    } catch {
      // Public article rendering should not fail if optional author metadata is unavailable.
    }
  }

  if (name === "Abhyudaya Alumni" && authorUid) {
    try {
      const user = await db.collection("users").doc(authorUid).get();
      if (user.exists) name = resolveAuthorName(user.data());
    } catch {
      // Keep the same safe generic fallback used by the React article page.
    }
  }

  if (name === "Abhyudaya Alumni") return blog;
  return {
    ...blog,
    author: name,
    alumniAuthor: { ...(blog.alumniAuthor || {}), name },
  };
}

export function getBlogImage(blog) {
  const value = blog?.featuredImage || blog?.image;
  if (typeof value !== "string" || !value.trim()) return FALLBACK_IMAGE;
  try {
    const url = new URL(value.trim(), SITE_URL);
    if (url.protocol === "https:" && url.hostname && !url.username && !url.password) return url.href;
  } catch {
    // Invalid and non-public image references use the official logo.
  }
  return FALLBACK_IMAGE;
}

function decodeForUrlCheck(value) {
  return value
    .replace(/&#(x[\da-f]+|\d+);?/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : parseInt(code, 10)))
    .replace(/&colon;?/gi, ":")
    .replace(/[\u0000-\u0020\u007f]/g, "");
}

function safeUrl(value, kind) {
  const normalized = decodeForUrlCheck(String(value || "").trim());
  if (/^(?:https?:\/\/|\/|\.\/|\.\.\/|#)/i.test(normalized) && !normalized.startsWith("//")) return value;
  if (kind === "href" && /^(?:mailto:|tel:)/i.test(normalized)) return value;
  return "";
}

const ALLOWED_TAGS = new Set([
  "p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
  "blockquote", "strong", "b", "em", "i", "u", "s", "del", "code", "pre",
  "a", "img", "figure", "figcaption", "div", "span", "sub", "sup", "hr",
]);
const VOID_TAGS = new Set(["br", "img", "hr"]);
const ALLOWED_ATTRIBUTES = new Set(["href", "src", "alt", "title", "target", "width", "height"]);

function sanitizeArticleHtml(html) {
  let output = String(html || "").replace(/<!--[\s\S]*?-->/g, "");
  output = output.replace(/<(script|style|iframe|object|embed|svg|math|template|form|textarea|select|button)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  output = output.replace(/<(script|style|iframe|object|embed|svg|math|template|form|textarea|select|button)\b[^>]*>[\s\S]*$/gi, "");
  output = output.replace(/<(?:input|source|video|audio|canvas|link|meta|base)\b[^>]*\/?\s*>/gi, "");

  return output.replace(/<\s*(\/?)\s*([a-z][a-z0-9-]*)\b([^>]*)>/gi, (tag, closing, rawName, rawAttrs) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) return VOID_TAGS.has(name) ? "" : `</${name}>`;

    const attrs = [];
    const attrPattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let match;
    while ((match = attrPattern.exec(rawAttrs))) {
      const attrName = match[1].toLowerCase();
      if (!ALLOWED_ATTRIBUTES.has(attrName)) continue;
      let value = match[2] ?? match[3] ?? match[4] ?? "";
      if (attrName === "href" || attrName === "src") {
        value = safeUrl(value, attrName);
        if (!value) continue;
      }
      if (attrName === "target" && value !== "_blank") continue;
      if ((attrName === "width" || attrName === "height") && !/^\d{1,4}$/.test(value)) continue;
      attrs.push(`${attrName}="${escapeHtml(value)}"`);
    }
    if (name === "a" && attrs.some((attr) => attr.startsWith('target="_blank"'))) {
      attrs.push('rel="noopener noreferrer"');
    }
    const serialized = attrs.length ? ` ${attrs.join(" ")}` : "";
    return VOID_TAGS.has(name) ? `<${name}${serialized} />` : `<${name}${serialized}>`;
  });
}

export function articleText(content) {
  if (!content) return "";
  if (typeof content === "string") {
    const value = content.trim();
    if (value.startsWith("{")) {
      try { return articleText(JSON.parse(value)); } catch { /* Treat malformed JSON as legacy content. */ }
    }
    return value
      .replace(/<(script|style|iframe|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (typeof content === "object") {
    if (typeof content.text === "string" && content.text.trim()) return content.text.trim();
    if (content.type === "image") return "image";
    if (Array.isArray(content.content)) return content.content.map(articleText).filter(Boolean).join(" ");
  }
  return "";
}

export function hasMeaningfulBlogContent(blog) {
  return Boolean(articleText(blog?.content));
}

export function isValidPublishedBlog(blog) {
  if (!blog || blog.status !== "Published") return false;
  if (typeof blog.title !== "string" || !blog.title.trim()) return false;
  if (typeof blog.slug !== "string" || blog.slug.length < 2 || blog.slug.length > 100) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(blog.slug) || normalizeBlogSlug(blog.slug) !== blog.slug) return false;
  return hasMeaningfulBlogContent(blog);
}

export async function renderBlogBody(content) {
  if (!content) return "";
  let value = content;
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try { value = JSON.parse(value); } catch { /* Preserve legacy HTML below. */ }
  }

  if (value && typeof value === "object") {
    const [htmlModule, starterKitModule, underlineModule, linkModule, alignModule, imageModule] = await Promise.all([
      import("@tiptap/html"),
      import("@tiptap/starter-kit"),
      import("@tiptap/extension-underline"),
      import("@tiptap/extension-link"),
      import("@tiptap/extension-text-align"),
      import("@tiptap/extension-image"),
    ]);
    const html = htmlModule.generateHTML(value, [
      starterKitModule.default.configure({ link: false, underline: false }),
      underlineModule.default,
      linkModule.default,
      alignModule.default.configure({ types: ["heading", "paragraph"] }),
      imageModule.default,
    ]);
    return sanitizeArticleHtml(html);
  }
  return sanitizeArticleHtml(value);
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => ({
    "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", "\u2028": "\\u2028", "\u2029": "\\u2029",
  })[char]);
}

export async function renderBlogArticle(blog) {
  const date = getBlogDate(blog);
  const dateIso = date?.toISOString() || "";
  const updatedDate = blog.updatedAt?.toDate?.() || blog.updatedAt || date;
  const updatedDateIso = updatedDate instanceof Date && !Number.isNaN(updatedDate.getTime())
    ? updatedDate.toISOString()
    : dateIso;
  const dateLabel = date
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date)
    : "";
  const author = getBlogAuthor(blog);
  const image = getBlogImage(blog);
  const body = await renderBlogBody(blog.content);
  const article = `<article class="blog-details-container prerendered-blog-article"><h1>${escapeHtml(blog.title)}</h1><p class="prerendered-blog-byline">${dateLabel ? `<time datetime="${escapeHtml(dateIso)}">${escapeHtml(dateLabel)}</time>` : ""}${dateLabel ? " · " : ""}<span>${escapeHtml(author)}</span></p><img class="details-featured-image" src="${escapeHtml(image)}" alt="${escapeHtml(blog.title)}" loading="eager" />${body ? `<div class="details-content">${body}</div>` : ""}</article>`;
  const description = String(blog.seo || blog.excerpt || articleText(blog.content).slice(0, 300) || blog.title).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  const canonical = `${SITE_URL}/blog/${encodeURIComponent(blog.slug)}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    headline: blog.title,
    name: blog.title,
    description,
    url: canonical,
    image: { "@type": "ImageObject", url: image, width: 1200, height: 630 },
    author: { "@type": blog.alumniAuthor ? "Person" : "Organization", name: author },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Abhyudaya Club",
      logo: { "@type": "ImageObject", url: FALLBACK_IMAGE, width: 512, height: 512 },
    },
    ...(dateIso ? { datePublished: dateIso, dateModified: updatedDateIso || dateIso } : {}),
    articleSection: blog.category || "Blog",
    inLanguage: "en-IN",
    isPartOf: { "@type": "Blog", "@id": `${SITE_URL}/blog`, name: "Abhyudaya Club Blog" },
  };

  return {
    html: `<noscript id="prerendered-blog-content"><div style="max-width:900px;margin:2rem auto;padding:0 1rem;font-family:Arial,sans-serif;line-height:1.7">${article}</div></noscript>`,
    title: `${blog.title} | Abhyudaya Club`,
    description,
    canonical,
    image,
    author,
    dateIso,
    updatedDateIso,
    schema: jsonForHtml(schema),
  };
}

export function renderBlogListing(blogs = []) {
  const links = blogs.map((blog) => {
    const href = `/blog/${encodeURIComponent(blog.slug)}`;
    return `<li><a href="${escapeHtml(href)}">${escapeHtml(blog.title)}</a>${blog.excerpt ? `<p>${escapeHtml(String(blog.excerpt).replace(/<[^>]*>/g, " ").trim())}</p>` : ""}</li>`;
  }).join("");
  return `<noscript id="prerendered-blog-listing"><nav aria-label="Published blog articles"><h1>Abhyudaya Club Blog</h1><ul>${links}</ul></nav></noscript>`;
}

export function injectBlogSeo(html, blogSeo) {
  let result = html;
  const replaceMeta = (attribute, key, value) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<meta\\s+${attribute}=["']${escapedKey}["']\\s+content=["'][^"']*["']\\s*\\/?>`, "i");
    const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`;
    result = pattern.test(result) ? result.replace(pattern, tag) : result.replace(/<\/head>/i, `  ${tag}\n</head>`);
  };
  result = result.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(blogSeo.title)}</title>`);
  replaceMeta("name", "description", blogSeo.description);
  replaceMeta("name", "robots", "index,follow,max-image-preview:large,max-snippet:-1");
  replaceMeta("name", "author", blogSeo.author);
  replaceMeta("property", "og:type", "article");
  replaceMeta("property", "og:title", blogSeo.title);
  replaceMeta("property", "og:description", blogSeo.description);
  replaceMeta("property", "og:url", blogSeo.canonical);
  replaceMeta("property", "og:image", blogSeo.image);
  replaceMeta("property", "og:image:alt", blogSeo.title.replace(/\s*\|\s*Abhyudaya Club$/, ""));
  replaceMeta("name", "twitter:card", "summary_large_image");
  replaceMeta("name", "twitter:title", blogSeo.title);
  replaceMeta("name", "twitter:description", blogSeo.description);
  replaceMeta("name", "twitter:image", blogSeo.image);
  if (blogSeo.dateIso) {
    replaceMeta("property", "article:published_time", blogSeo.dateIso);
    replaceMeta("property", "article:modified_time", blogSeo.updatedDateIso || blogSeo.dateIso);
  }
  replaceMeta("property", "og:image:width", "1200");
  replaceMeta("property", "og:image:height", "630");
  replaceMeta("property", "article:author", blogSeo.author);
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(blogSeo.canonical)}" />`;
  const canonicalPattern = /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i;
  result = canonicalPattern.test(result) ? result.replace(canonicalPattern, canonicalTag) : result.replace(/<\/head>/i, `  ${canonicalTag}\n</head>`);
  const schemaTag = `<script id="prerender-blogposting-schema" data-rh="true" type="application/ld+json">${blogSeo.schema}</script>`;
  result = result.replace(/<\/head>/i, `  ${schemaTag}\n</head>`);
  result = result.replace(/<div\s+id=["']root["']\s*>/i, (root) => `${blogSeo.html}${root}`);
  return result;
}

export function injectBlogListing(html, listing) {
  return html.replace(/<div\s+id=["']root["']\s*>/i, (root) => `${listing}${root}`);
}
