import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Products — LeafLand Kerala",
  description: "Browse a selection of plants, saplings, and spices from LeafLand Kerala.",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f8faf9]">{children}</div>;
}
