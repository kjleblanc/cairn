import { BODIES, bodyBaseUrl } from "../../shared/bodies.js";

/** The custom-seat note (task 127), pure on purpose: no Electron, no I/O.
 *
 * When the connected seat is NOT one of the curated picker entries, the
 * conductor's turn gains one system note so Cairn itself can offer the
 * add-a-model task — closing the loop the connect card's not-listed panel
 * describes — instead of the owner copying a sentence into chat by hand.
 *
 * The note carries ONLY the model id and host: both already reach the
 * provider as the API call's own `model` field and endpoint, so nothing new
 * leaves the machine, and the connected-conductor data scope is untouched.
 * It never sees the stored key (`StoredConnection` is not the input here —
 * just the two plain fields), and it is labeled as code-assembled so the
 * model never mistakes it for its own words or the owner's.
 *
 * A curated seat earns silence: the picker's own entries need no offer. A
 * curated id reached through a different host does NOT match — Cairn must
 * not vouch for an unknown endpoint. */
export function connectionNoteFor(baseUrl: string, model: string): string | null {
  const curated = BODIES.some((body) => body.id === model && bodyBaseUrl(body) === baseUrl);
  if (curated) return null;
  const host = new URL(baseUrl).host;
  return `Connection facts (assembled by Cairn's code, not by a model): the owner connected with a model that is not in the picker's curated list — "${model}" via ${host}. Once, at a natural early moment, offer to add it to the picker as a Cairn task; the owner may also simply keep using it as-is. If the owner declines or does not engage, let it go and do not offer again.`;
}
