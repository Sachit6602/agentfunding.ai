import "./globals.css";

export const metadata = {
  title: "agentfunding.exe — Autonomous Trading Agent",
  description: "Autonomous trading agent on Kite AI with x402 payments and on-chain attestations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
