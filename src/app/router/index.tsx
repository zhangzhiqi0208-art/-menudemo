import { Routes, Route, Navigate } from "react-router-dom";
import MenuListPage from "@/pages/MenuListPage";
import NewItemPage from "@/pages/NewItemPage";
import NotFound from "@/pages/NotFound";

// 新的路由集中定义。目前保持与旧 App.tsx 完全一致，避免影响现有行为。
export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<MenuListPage />} />
      <Route path="/menu/new" element={<NewItemPage />} />
      <Route path="/menu/edit/:itemId" element={<NewItemPage />} />
      <Route path="*" element={<NotFound />} />
      {/* 如需使用领域化的路由，可逐步切换到下面这些：
        <Route path="/" element={<DishesListPage />} />
        <Route path="/menu/new" element={<DishFormPage mode="create" />} />
        <Route path="/menu/edit/:itemId" element={<DishFormPage mode="edit" />} />
      */}
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

