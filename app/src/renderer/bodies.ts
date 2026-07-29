/**
 * Compatibility shim, added in the Task 128 repair commit. The Task 126/127
 * lane's staged rename of this module to `../shared/bodies` was swept into
 * the motion lane's commit (8b895f8) by a staging race, leaving HEAD without
 * this path while `components/ConnectCard.tsx` at that commit still imported
 * it. This re-export keeps every existing `../bodies` import working; the
 * canonical module is `../shared/bodies`. A future cleanup may delete this
 * shim once no import of `../bodies` remains.
 */
export * from "../shared/bodies";
