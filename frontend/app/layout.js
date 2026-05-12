import "./globals.css";

export const metadata = {
  title: "MuseFlow",
  description: "Generate styled music from text and a 5-second reference clip.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
