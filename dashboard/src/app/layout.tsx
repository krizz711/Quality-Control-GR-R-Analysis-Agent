import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arad Quality Intelligence Platform",
  description: "Manufacturing quality control — GR&R analysis, SPC monitoring, predictive analytics, and intelligent alerting for industrial quality teams.",
  keywords: ["quality control", "GR&R", "SPC", "manufacturing", "AI", "statistical process control"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
