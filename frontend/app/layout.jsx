import "./globals.css";

export const metadata = {
  title: "TradeFlow — Autonomous Trading Agent",
  description:
    "Autonomous trading agent on Kite AI with x402 payments and on-chain attestations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
