import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | LeafLand Kerala",
  description: "Sign in to LeafLand Kerala Agriculture ERP",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
