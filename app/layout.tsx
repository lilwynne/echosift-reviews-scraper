import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeatureMap - 用户评价分析与竞品调研",
  description: "帮助运营人员、小企业主和产品经理分析用户评价、情绪和竞品差异。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
