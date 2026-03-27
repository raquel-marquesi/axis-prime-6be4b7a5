import { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <main className="p-6">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
