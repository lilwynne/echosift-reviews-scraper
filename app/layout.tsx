import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoSift - 用户评价分析与竞品调研",
  description:
    "免费、轻量地分析用户评价，快速提取情绪、痛点、需求请求和竞品差异。"
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
