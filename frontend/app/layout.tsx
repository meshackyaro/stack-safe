import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import { WalletProvider } from "@/contexts/wallet-context";
import { ThemeProvider } from "@/contexts/theme-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowFundz - Stacks Savings dApp",
  description: "A decentralized savings vault built on Stacks blockchain with time-locked deposits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Ensure dark mode is always applied
                document.documentElement.classList.remove('light', 'system');
                document.documentElement.classList.add('dark');
                // Clean up any old theme preferences
                try {
                  localStorage.removeItem('theme-preference');
                } catch (e) {
                  // Ignore localStorage errors
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white`}
      >
        <ThemeProvider>
          <WalletProvider>
            <Navbar />
            <main className="min-h-screen">
              {children}
            </main>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
