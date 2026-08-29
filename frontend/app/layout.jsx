import "./globals.css";

export const metadata = {
  title: "AI Collaborative Workspace",
  description: "Project-centric AI workspace for small teams"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0d10",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

