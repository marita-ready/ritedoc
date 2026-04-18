import Navbar from "./Navbar";
import Footer from "./Footer";
import SchemaMarkup, { organisationSchema } from "./SchemaMarkup";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Organisation schema injected on every page via Layout */}
      <SchemaMarkup schemas={[organisationSchema]} />
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24">
        {children}
      </main>
      <Footer />
    </div>
  );
}
