export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

export const sanitizeRichHtml = (value: string) => {
  const documentNode = new DOMParser().parseFromString(value, "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "BLOCKQUOTE"]);

  const clean = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
    if (!(node instanceof HTMLElement) || !allowed.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => fragment.appendChild(clean(child)));
      return fragment;
    }
    const element = document.createElement(node.tagName.toLowerCase());
    Array.from(node.childNodes).forEach((child) => element.appendChild(clean(child)));
    return element;
  };

  const wrapper = document.createElement("div");
  Array.from(documentNode.body.childNodes).forEach((node) => wrapper.appendChild(clean(node)));
  return wrapper.innerHTML;
};
