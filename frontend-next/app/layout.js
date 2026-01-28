import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "KanjiLock",
  description: "Learn Kanji the smart way",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ padding: "20px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
