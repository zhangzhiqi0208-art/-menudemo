/** 在 AdminLayout 的 `main` 滚动容器内，将字段滚入可视区（预留顶栏/Tab 高度）。 */
export function scrollFieldIntoViewInAdminMain(
  fieldElement: HTMLElement | null,
  options?: { topOffset?: number },
) {
  if (!fieldElement) return;
  const main = fieldElement.closest("main");
  const offset = options?.topOffset ?? 110;
  if (!main) {
    fieldElement.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const m = main.getBoundingClientRect();
  const f = fieldElement.getBoundingClientRect();
  const top = f.top - m.top + main.scrollTop - offset;
  main.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
