/**
 * Lab boot: install the mock bridge FIRST (the real renderer reads
 * `window.cairn` the moment its modules evaluate), mount the scenario
 * panel, then load the real renderer entry so the lab runs the exact App
 * the desktop ships.
 */
import { installMockCairn } from "./mock-cairn";
import { mountControls } from "./controls";

installMockCairn();
mountControls();

void import("../src/renderer/main");
