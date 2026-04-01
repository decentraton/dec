import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "../components/WalletContextProvider";

export const metadata: Metadata = {
  title: "DePIN AI Oracle — Autonomous GPU Pricing on Solana",
  description:
    "AI-powered dynamic pricing oracle for DePIN GPU networks. Gemini AI adjusts prices every 60s based on real market signals, recorded on-chain.",
  openGraph: {
    title: "DePIN AI Oracle",
    description: "Autonomous GPU pricing powered by AI on Solana",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#080c10" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,700;1,400&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* preconnect for devnet RPC */}
        <link rel="preconnect" href="https://api.devnet.solana.com" />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" style={{
          position: "absolute", left: "-9999px", top: "auto",
          width: "1px", height: "1px", overflow: "hidden",
        }}>
          Skip to main content
        </a>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
