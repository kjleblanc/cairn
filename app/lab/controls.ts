/**
 * The lab's scenario panel — lab-only DOM, mounted outside the React root,
 * so nothing the shipped app renders is touched. It drives the mock
 * bridge's world through `window.__lab`, posing the states a designer
 * needs to see: quiet, thinking, a live worker, and both result cards.
 */
import type { LabScenario } from "./mock-cairn";

const SCENARIOS: { id: LabScenario; label: string; hint: string }[] = [
  { id: "idle", label: "Quiet", hint: "no stream, no task" },
  { id: "thinking", label: "Cairn thinking", hint: "a reply streams in" },
  { id: "running", label: "Task running", hint: "a worker appears" },
  { id: "done", label: "DONE card", hint: "the envelope posts" },
  { id: "stopped", label: "STOPPED card", hint: "protected work changed" },
];

export function mountControls(): void {
  const panel = document.createElement("div");
  panel.id = "lab-controls";
  const title = document.createElement("p");
  title.className = "lab-controls-title";
  title.textContent = "lab scenarios";
  panel.appendChild(title);
  for (const scenario of SCENARIOS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lab-controls-button";
    button.textContent = scenario.label;
    button.title = scenario.hint;
    button.addEventListener("click", () => {
      for (const other of panel.querySelectorAll(".lab-controls-button")) other.classList.remove("active");
      button.classList.add("active");
      window.__lab?.setScenario(scenario.id);
    });
    panel.appendChild(button);
  }
  document.body.appendChild(panel);
}
