import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { atomicWriteText } from "./atomicwrite.js";
import {
  createCriticCalibrationFakeTransport,
  type CriticCalibrationFakeTransportV1,
} from "./criticcalibration.js";

/** Test evidence only, under CAIRN_TEST_USER_DATA. The authenticated
 * calibration store never reads or trusts this marker. */
export const CRITIC_CALIBRATION_E2E_REQUEST_FILE = "critic-calibration-e2e-request.json";

export function createCriticCalibrationE2eFake(input: {
  profileRoot: string;
  holdUntilCancelled: boolean;
}): CriticCalibrationFakeTransportV1 {
  const marker = join(resolve(input.profileRoot), CRITIC_CALIBRATION_E2E_REQUEST_FILE);

  const fetchImpl: typeof fetch = async (url, init): Promise<Response> => {
    const body = typeof init?.body === "string" ? init.body : null;
    if (String(url) !== "https://critic-calibration.invalid/v1/chat/completions"
      || init?.method !== "POST" || body === null) {
      throw new Error("CRITIC_CALIBRATION_E2E_FAKE_BOUNDARY_MISMATCH");
    }

    // Capture exactly what reached the injected fake. This contains only the
    // preregistered synthetic request and lives only in Playwright's isolated
    // throwaway profile; it is the Electron packet-boundary receipt.
    let previous: { invocationCount: number; requests: Array<{ url: string; body: string }> } = {
      invocationCount: 0,
      requests: [],
    };
    if (existsSync(marker)) {
      try {
        const parsed = JSON.parse(readFileSync(marker, "utf8")) as typeof previous;
        if (!Number.isSafeInteger(parsed.invocationCount) || parsed.invocationCount < 0 || parsed.invocationCount > 16
          || !Array.isArray(parsed.requests) || parsed.requests.length !== parsed.invocationCount) throw new Error("marker");
        previous = parsed;
      } catch { throw new Error("CRITIC_CALIBRATION_E2E_FAKE_MARKER_INVALID"); }
    }
    const requests = [...previous.requests, { url: String(url), body }];
    atomicWriteText(marker, `${JSON.stringify({ invocationCount: previous.invocationCount + 1, requests })}\n`);

    if (input.holdUntilCancelled) {
      await new Promise<never>((_resolve, reject) => {
        const signal = init.signal;
        if (signal?.aborted) { reject(new Error("cancelled")); return; }
        signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
      });
    }

    // A bounded, deliberately invalid CriticOutput. The transport completed,
    // then the orchestrator must record CRITIC_CALIBRATION_OUTPUT_INVALID; no
    // fixture outcome can accidentally become live activation evidence.
    return new Response(JSON.stringify({
      id: "cairn-e2e-synthetic-request",
      model: "cairn/synthetic-critic-v1",
      choices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const transport = createCriticCalibrationFakeTransport(fetchImpl);
  if (transport === null) throw new Error("CRITIC_CALIBRATION_E2E_FAKE_UNAVAILABLE");
  return transport;
}
