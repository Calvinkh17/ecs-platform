import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { DevRoleProvider } from "@/lib/dev-role-context";
import DevPreviewBanner from "@/components/DevPreviewBanner";
import DevRoleSwitcher from "@/components/DevRoleSwitcher";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "ECS Platform",
  description: "School management platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-primary font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <DevRoleProvider userEmail={me?.email ?? null}>
            <DevPreviewBanner />
            {children}
            <DevRoleSwitcher realRole={me?.role ?? "pending"} />
          </DevRoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
