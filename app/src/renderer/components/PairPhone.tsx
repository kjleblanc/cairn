import { useCallback, useEffect, useState } from "react";
import type { PairingOffer, PhoneBridgeState } from "../../shared/ipc";
import { BRIDGE_PAIRING_DISCLOSURE } from "../../shared/ipc";
import { cairn } from "../api";
import { Card, Pill } from "./Ui";

/**
 * Task 143: the desktop's half of pairing — a minimal settings entry. It
 * shows the address the phone should open, mints a short-lived code on
 * request, carries the spec's disclosure sentence verbatim, and lists the
 * paired devices with revocation. The code is shown here and nowhere else:
 * it is never written to disk and never logged.
 */
export function PairPhone() {
  const [state, setState] = useState<PhoneBridgeState | null>(null);
  const [offer, setOffer] = useState<PairingOffer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setState(await cairn.phoneBridgeState());
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // While a code is live, tick once a second: the countdown stays honest
  // and a phone that finishes pairing appears in the list on its own.
  useEffect(() => {
    if (offer === null) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      void refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [offer, refresh]);

  const secondsLeft = offer === null ? 0 : Math.max(0, Math.floor((Date.parse(offer.expiresAt) - now) / 1000));
  const liveOffer = offer !== null && secondsLeft > 0 ? offer : null;

  // An expired code is cleared by effect, never mid-render: the bridge has
  // already forgotten it, so the screen simply stops showing it.
  useEffect(() => {
    if (offer !== null && Date.parse(offer.expiresAt) <= Date.now()) setOffer(null);
  }, [offer, now]);

  async function showCode() {
    setError(null);
    const result = await cairn.phoneBridgePairBegin();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOffer(result.value);
  }

  async function revoke(id: string) {
    const result = await cairn.phoneBridgeRevokeDevice(id);
    if (!result.ok) setError(result.message);
    await refresh();
  }

  function copyAddress(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => setCopied(false)); // clipboard unavailable: the address stays on screen to copy by hand
  }

  return (
    <Card title="pair a phone">
      {state === null ? <p className="small muted">Checking…</p> : null}

      {state !== null && !state.running ? (
        <p>{state.reason ?? "The phone bridge isn't running."}</p>
      ) : null}

      {state?.running && state.url ? (
        <>
          <p className="small">
            On your phone, on this Wi-Fi, open: <span className="mono">{state.url}</span>{" "}
            <button className="pill pill-quiet" onClick={() => copyAddress(state.url ?? "")}>{copied ? "Copied" : "Copy"}</button>
          </p>
          {liveOffer === null ? (
            <Pill kind="primary" onClick={() => void showCode()}>Show a pairing code</Pill>
          ) : (
            <div className="card" style={{ marginTop: 10 }}>
              <p className="card-title">type this on your phone</p>
              <p className="mono" style={{ fontSize: 34, letterSpacing: "0.3em", margin: "6px 0", textAlign: "center" }}>{liveOffer.code}</p>
              <p className="small muted">
                at <span className="mono">{liveOffer.url}</span> — the code works once, for {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} more.
              </p>
              <p className="small">{BRIDGE_PAIRING_DISCLOSURE}</p>
            </div>
          )}
          {error ? <p className="small" style={{ color: "var(--stop)" }}>{error}</p> : null}

          {state.devices.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <p className="card-title">paired devices</p>
              {state.devices.map((device) => (
                <div className="row spread" key={device.id} style={{ marginTop: 6 }}>
                  <p className="small" style={{ margin: 0 }}>
                    {device.name}{" "}
                    <span className="muted">— paired {new Date(device.firstPaired).toLocaleDateString()}</span>
                  </p>
                  <Pill kind="quiet" onClick={() => void revoke(device.id)}>Unpair</Pill>
                </div>
              ))}
              <p className="small muted" style={{ marginTop: 8 }}>Unpairing ends that device's connection at once. The phone can pair again with a fresh code.</p>
            </div>
          ) : (
            <p className="small muted" style={{ marginTop: 10 }}>No phones paired yet.</p>
          )}
        </>
      ) : null}
    </Card>
  );
}
