/**
 * 系统内置菜品图：与各分类文件夹内资源按顺序对应；未分配到的菜品保持无图（空字符串）。
 */
import burger01 from "@/assets/系统内置/🍔招牌汉堡/burguer-bacon-classico.png";
import burger02 from "@/assets/系统内置/🍔招牌汉堡/burguer-bacon-e-gorgonzola.png";
import burger03 from "@/assets/系统内置/🍔招牌汉堡/burguer-bacon-picante.png";
import burger04 from "@/assets/系统内置/🍔招牌汉堡/burguer-bbq-bacon.png";

import combo01 from "@/assets/系统内置/🍟超值套餐/combo-bacon-supreme.png";
import combo02 from "@/assets/系统内置/🍟超值套餐/combo-feijoada-familia.png";
import combo03 from "@/assets/系统内置/🍟超值套餐/feijoada-completa.png";
import combo04 from "@/assets/系统内置/🍟超值套餐/pepsi-lata-350ml.png";

import limited01 from "@/assets/系统内置/每日限量菜品～售完即止/feijoada-light.png";

import original01 from "@/assets/系统内置/🧑‍🍳独家原创/esfiha-de-carne-com-tahine.png";
import original02 from "@/assets/系统内置/🧑‍🍳独家原创/esfiha-de-carne-tradicional.png";

import cola from "@/assets/系统内置/🍗小食饮料/可乐.png";
import snackSaladVeg from "@/assets/系统内置/🍗小食饮料/salada-de-quinoa-a-grega.png";
import snackSaladCheese from "@/assets/系统内置/🍗小食饮料/salada-de-camarao-a-grega.png";
import snackSaladClassic from "@/assets/系统内置/🍗小食饮料/salada-grega-classica.png";

import iceVanilla from "@/assets/系统内置/🍦冰淇淋/香草冰淇淋.png";
import iceStrawberry from "@/assets/系统内置/🍦冰淇淋/草莓冰淇淋.png";

/** 菜品 id → 内置图 URL（Vite 处理后的路径） */
export const BUILTIN_MENU_IMAGE_BY_ITEM_ID: Record<string, string> = {
  // 🍔招牌汉堡：文件夹 4 张，第 5 道菜无图
  "0-1": burger01,
  "0-2": burger02,
  "0-3": burger03,
  "0-4": burger04,
  // 🍟超值套餐：4 张对 4 道菜
  "1-1": combo01,
  "1-2": combo02,
  "1-3": combo03,
  "1-4": combo04,
  // 🐮每日限量…：文件夹名与系统分类一致（不含 emoji 前缀）
  "2-1": limited01,
  // 🧑‍🍳独家原创
  "3-1": original01,
  "3-2": original02,
  // 🍗小食饮料：沙拉与分类文件夹内资源对应；芬达.png、salada-grega-com-frango-grelhado.png 无对应菜品则不分配
  "4-8": snackSaladVeg,
  "4-9": snackSaladCheese,
  "4-10": snackSaladClassic,
  "4-11": cola,
  // 🍦冰淇淋：文件夹仅有香草、草莓；巧克力冰淇淋无对应资源则保持无图
  "6-1": iceVanilla,
  "6-2": iceStrawberry,
};
