"use client";

type Props = {
  onClose: () => void;
  onUnlock: () => void;
};

// Stub checkout. Wire the onUnlock handler to a real Stripe Checkout
// session (or App Store / Play Billing product for a native wrapper)
// before shipping — this currently just flips a local flag.
export default function PaywallModal({ onClose, onUnlock }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-panel p-6">
        <h2 className="text-lg font-semibold text-white">Investigator Mode</h2>
        <p className="mt-2 text-sm text-white/60">
          $9.99 / 3 months. Unlocks the distance meter, EVP recording, audio
          session logs, and personal-voice sessions.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white"
          >
            Not now
          </button>
          <button
            onClick={onUnlock}
            className="rounded-lg bg-veil px-4 py-2 text-sm font-medium text-black hover:bg-veil/80"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
