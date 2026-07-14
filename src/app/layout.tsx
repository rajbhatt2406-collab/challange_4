import type { Metadata } from "next";
import { Outfit, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const scoreboard = Share_Tech_Mono({
  weight: "400",
  variable: "--font-scoreboard",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PulseOps | World Cup 2026 Operations",
  description: "GenAI-powered stadium operations command layer for the FIFA World Cup 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${scoreboard.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
