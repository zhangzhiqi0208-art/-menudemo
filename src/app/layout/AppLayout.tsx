import type { PropsWithChildren } from "react";
import AdminLayout from "@/components/AdminLayout";

// 目前系统只有一个后台布局，先简单复用 AdminLayout。
// 后续如果有多布局/多版本差异，可以在这里做分发。
export const AppLayout = ({ children }: PropsWithChildren) => {
  return <AdminLayout>{children}</AdminLayout>;
};

