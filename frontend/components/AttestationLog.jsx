const KITE_EXPLORER = "https://testnet.kitescan.ai/tx";

export default function AttestationLog({ trades }) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="font-semibold">Kite Attestation Log</h2>
      </div>
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {trades.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 tabular-nums shrink-0">
              {new Date(t.timestamp).toLocaleTimeString()}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded shrink-0 ${
                t.action === "hold"
                  ? "bg-gray-800 text-gray-400"
                  : "bg-blue-900/60 text-blue-300"
              }`}
            >
              {t.action.toUpperCase()}
            </span>
            {t.attestation_tx_hash ? (
              <a
                href={`${KITE_EXPLORER}/${t.attestation_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline font-mono truncate"
              >
                {t.attestation_tx_hash.slice(0, 14)}…
              </a>
            ) : (
              <span className="text-gray-600">pending…</span>
            )}
          </div>
        ))}
        {trades.length === 0 && (
          <p className="text-gray-600 text-xs">No attestations yet.</p>
        )}
      </div>
    </div>
  );
}
