import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeatureMap - 用户反馈到功能路线图",
  description: "将产品评价转化为需求地图、情绪洞察和迭代优先级。"
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
