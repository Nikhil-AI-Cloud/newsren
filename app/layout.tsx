import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { SampleNotice } from "@/components/layout/sample-notice";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { contentMode } from "@/server/config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Newsren", template: "%s · Newsren" },
  description:
    "Discover news from official and original publishers, with excerpts and links back to the source. Prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {contentMode() === "sample" && <SampleNotice />}
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
