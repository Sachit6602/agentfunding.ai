"use client";

import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

/*
  Usage:
    const { toasts, toast } = useToasts();
    toast.success("Position closed!") / toast.error("Failed") / toast.info("…")
    <ToastStack toasts={toasts} onDismiss={dismissToast} />
*/

export function useToasts() {
  const [toasts, setToasts] = useReducerState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message, duration = 4500) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const toast = {
    success: (msg, dur) => push("success", msg, dur),
    error:   (msg, dur) => push("error",   msg, dur ?? 6000),
    info:    (msg, dur) => push("info",    msg, dur),
  };

  return { toasts, toast, dismissToast: dismiss };
}

function useReducerState(init) {
  const [state, setState] = useStateShim(init);
  return [state, setState];
}

// Plain useState wrapper so the hook above works without importing React explicitly
import { useState } from "react";
function useStateShim(init) {
  return useState(init);
}

const ICONS = {
  success: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STYLES = {
  success: "bg-[#0d2318] border-green-500/30 text-green-300",
  error:   "bg-[#1f0d0d] border-red-500/30 text-red-300",
  info:    "bg-[#0d1526] border-blue-500/30 text-blue-300",
};

function Toast({ toast, onDismiss }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl text-sm animate-toast-in ${STYLES[toast.type]}`}
      style={{ minWidth: 280, maxWidth: 380 }}
    >
      {ICONS[toast.type]}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-40 hover:opacity-80 transition-opacity mt-0.5 shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastStack({ toasts, onDismiss }) {
  if (typeof window === "undefined" || !toasts.length) return null;
  return createPortal(
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}
