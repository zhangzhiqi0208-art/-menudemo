import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { MenuProvider } from "@/contexts/MenuContext";
import { VersionProvider } from "./VersionProvider";

const queryClient = new QueryClient();

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <VersionProvider>
          <MenuProvider>{children}</MenuProvider>
        </VersionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

