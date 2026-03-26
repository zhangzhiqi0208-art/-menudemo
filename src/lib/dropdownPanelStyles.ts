/** 设计规范：下拉/选择面板内选项的悬停与键盘高亮背景 */
export const dropdownOptionHighlightClassName =
  "data-[highlighted]:bg-[#F7F7FA] focus:bg-[#F7F7FA]";

/** 子菜单触发项、Menubar 等 open/focus 态背景（与选项一致） */
export const dropdownSubTriggerHighlightClassName =
  "data-[state=open]:bg-[#F7F7FA] data-[highlighted]:bg-[#F7F7FA] focus:bg-[#F7F7FA]";

/** Popover 内自定义列表行（如多选筛选项）悬停/焦点环内背景 */
export const popoverListRowHighlightClassName =
  "hover:bg-[#F7F7FA] focus-within:bg-[#F7F7FA]";
