import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-1">TradeFlow</h1>
        <p className="text-gray-400 mb-8 text-sm">
          Autonomous Trading Agent · Kite AI Testnet
        </p>
        <Dashboard />
      </div>
    </main>
  );
}
