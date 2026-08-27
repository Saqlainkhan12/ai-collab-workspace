import "./globals.css";

export const metadata = {
  title: "AI Collaborative Workspace",
  description: "Project-centric AI workspace for small teams"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
