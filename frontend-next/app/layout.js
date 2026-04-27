import "./globals.css";
import Navbar from "@/components/Navbar";
import SenseiChat from "@/components/SenseiChat";

export const metadata = {
  title: "KanjiLock",
  description: "Learn Kanji the smart way",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KanjiLock",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import PageTransition from "@/components/PageTransition";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ padding: "80px 20px 120px 20px" }}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <SenseiChat />
      </body>
    </html>
  );
}
