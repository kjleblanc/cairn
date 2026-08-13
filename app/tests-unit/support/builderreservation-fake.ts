import {
  BUILDER_RESERVATION_FAKE_RECEIPT_VERSION,
  BUILDER_RESERVATION_HANDLER_REVISION,
  composeBuilderReservationFakeReceiptForTest,
  consumeBuilderReservationGrantForFake,
  parseBuilderReservationBindingForFake,
  type BuilderReservationFakeReceiptV1,
} from "../../src/main/builderreservation.js";

export type { BuilderReservationFakeReceiptV1 } from "../../src/main/builderreservation.js";

/** Compile-time-closed, effect-free Task-227 consumer. */
export const BUILDER_RESERVATION_FAKE_HANDLER_REVISION =
  BUILDER_RESERVATION_HANDLER_REVISION;

export type BuilderReservationFakeBehavior = "accept" | "refuse" | "throw";

export type BuilderReservationFakeAttemptV1 =
  | Readonly<{
      status: "not-consumed";
      code: "BUILDER_RESERVATION_GRANT_INVALID" | "BUILDER_RESERVATION_FAKE_BEHAVIOR_INVALID";
    }>
  | (BuilderReservationFakeReceiptV1 & Readonly<{
      version: typeof BUILDER_RESERVATION_FAKE_RECEIPT_VERSION;
      handlerRevision: typeof BUILDER_RESERVATION_HANDLER_REVISION;
    }>);

/**
 * Run the only Task-227 handler. Its closed behavior selects no callback or
 * external action. A genuine attempt is spent before accept/refuse/throw.
 */
export function invokeBuilderReservationFake(
  grant: unknown,
  bindingValue: unknown,
  behavior: BuilderReservationFakeBehavior,
): BuilderReservationFakeAttemptV1 {
  if (behavior !== "accept" && behavior !== "refuse" && behavior !== "throw") {
    return Object.freeze({ status: "not-consumed", code: "BUILDER_RESERVATION_FAKE_BEHAVIOR_INVALID" });
  }
  const expected = parseBuilderReservationBindingForFake(bindingValue);
  if (expected?.handlerRevision !== BUILDER_RESERVATION_HANDLER_REVISION) {
    return Object.freeze({ status: "not-consumed", code: "BUILDER_RESERVATION_GRANT_INVALID" });
  }
  const consumption = consumeBuilderReservationGrantForFake(grant, expected);
  if (consumption === null) {
    return Object.freeze({ status: "not-consumed", code: "BUILDER_RESERVATION_GRANT_INVALID" });
  }
  if (behavior === "throw") throw new Error("BUILDER_RESERVATION_FAKE_THROW");
  const receipt = composeBuilderReservationFakeReceiptForTest(
    consumption,
    behavior === "accept" ? "accepted" : "refused",
  );
  if (receipt === null) throw new Error("BUILDER_RESERVATION_FAKE_RECEIPT_UNAVAILABLE");
  return receipt;
}
