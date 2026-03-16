import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MenuProvider } from "@/contexts/MenuContext";
import MenuListPage from "./pages/MenuListPage";
import NewItemPage from "./pages/NewItemPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <MenuProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MenuListPage />} />
            <Route path="/menu/new" element={<NewItemPage />} />
            <Route path="/menu/edit/:itemId" element={<NewItemPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </MenuProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
