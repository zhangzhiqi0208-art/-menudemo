/**
 * 系统预置的可关联选项组（示例数据，后续可替换为接口或配置）。
 */
export type PresetOptionGroupModifier = {
  name: string;
  /** 展示用价格文案，如 "0.00" 或 "R$ 0.00" */
  price: string;
};

export type PresetOptionGroup = {
  id: string;
  title: string;
  min: number;
  max: number;
  modifiers: PresetOptionGroupModifier[];
};

export const PRESET_OPTION_GROUPS: PresetOptionGroup[] = [
  {
    id: "preset-snacks",
    title: "小吃",
    min: 1,
    max: 1,
    modifiers: [
      { name: "薯条", price: "0.00" },
      { name: "炸鸡", price: "0.00" },
      { name: "洋葱圈", price: "0.00" },
    ],
  },
  {
    id: "preset-drinks",
    title: "饮料",
    min: 1,
    max: 1,
    modifiers: [
      { name: "可乐", price: "0.00" },
      { name: "雪碧", price: "0.00" },
      { name: "芬达", price: "0.00" },
    ],
  },
  {
    id: "preset-salad",
    title: "沙拉",
    min: 1,
    max: 1,
    modifiers: [
      { name: "蔬菜沙拉", price: "0.00" },
      { name: "芝士沙拉", price: "0.00" },
      { name: "经典沙拉", price: "0.00" },
    ],
  },
];
