import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K6 Load Test Live Report",
  description: "Real-time reporting dashboard for K6 load tests",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
