import type { ModelConnectionDriver } from "./drivers/types.js";

const DRIVER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export interface ModelConnectionDriverRegistry {
  get(driverId: string): ModelConnectionDriver | null;
}

function validDriver(driver: ModelConnectionDriver): boolean {
  return DRIVER_ID.test(driver.driverId)
    && Number.isSafeInteger(driver.freshnessPolicy.staleAfterMs)
    && Number.isSafeInteger(driver.freshnessPolicy.hardTtlMs)
    && driver.freshnessPolicy.staleAfterMs > 0
    && driver.freshnessPolicy.hardTtlMs >= driver.freshnessPolicy.staleAfterMs
    && (driver.providerDefaultSemantics === "verified-exact"
      || driver.providerDefaultSemantics === "not-verified")
    && typeof driver.accessProvider === "function"
    && typeof driver.fetchCatalog === "function"
    && typeof driver.recommendation === "function"
    && typeof driver.modelAuthor === "function";
}

/** Registries are explicit immutable construction-time objects. A fake driver
 * is registered only by a test that owns this instance; production gains no
 * implicit/global provider surface. */
export function createModelConnectionDriverRegistry(
  drivers: readonly ModelConnectionDriver[],
): ModelConnectionDriverRegistry {
  const byId = new Map<string, ModelConnectionDriver>();
  for (const driver of drivers) {
    if (!validDriver(driver)) throw new Error("MODEL_CONNECTION_DRIVER_INVALID");
    if (byId.has(driver.driverId)) throw new Error("MODEL_CONNECTION_DRIVER_DUPLICATE");
    byId.set(driver.driverId, driver);
  }
  return Object.freeze({
    get(driverId: string): ModelConnectionDriver | null {
      return byId.get(driverId) ?? null;
    },
  });
}
