const KITE_EXPLORER = "https://explorer.testnet.kite.ai/tx";

export default function PaymentLog({ trades }) {
  const payments = trades.filter((t) => t.payment_tx_hash);

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="font-semibold">x402 Payment Log</h2>
      </div>
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {payments.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 tabular-nums shrink-0">
              {new Date(t.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-gray-300 font-mono">{t.instrument}</span>
            <a
              href={`${KITE_EXPLORER}/${t.payment_tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline font-mono truncate"
            >
              {t.payment_tx_hash.slice(0, 14)}…
            </a>
          </div>
        ))}
        {payments.length === 0 && (
          <p className="text-gray-600 text-xs">No payments yet.</p>
        )}
      </div>
    </div>
  );
}
