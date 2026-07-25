export default function getStyle<T extends Record<string, string[]>>(styles: T, key: keyof T) {
  return styles[key].join(" ");
}
