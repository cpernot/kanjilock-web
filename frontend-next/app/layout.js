import "./globals.css";
import Navbar from "@/components/Navbar";
import SenseiHelp from "@/components/SenseiHelp";
import SplashScreen from "@/components/SplashScreen";

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
import AuthGuard from "@/components/AuthGuard";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SplashScreen />
        <AuthGuard>
          <Navbar />
          <main style={{ padding: "80px 20px 120px 20px" }}>
            <PageTransition>
              {children}
            </PageTransition>
          </main>
          <SenseiHelp />
        </AuthGuard>
      </body>
    </html>
  );
}
