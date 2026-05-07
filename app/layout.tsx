import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoliSim",
  description:
    "Agent-Based Model mô phỏng vi cấu trúc thị trường chứng khoán Việt Nam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
