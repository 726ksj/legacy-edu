import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ConsultationFloatingCTA from "@/components/layout/ConsultationFloatingCTA";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <ConsultationFloatingCTA />
    </div>
  );
}
