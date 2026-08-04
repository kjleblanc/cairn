# Cairn Evidence — Bounded History Addendum

**Task:** 173

**Extends:** `2026-08-03-cairn-evidence-and-local-album-corrected.md`

## Why this addendum exists

The corrected plan put each trusted run in its own bounded directory, but its
phrase “page/sort independent run directories” still implied enumerating every
run before sorting. That work grows without limit as local history grows. This
addendum records the bounded discovery structure implemented after the storage
review; it does not change the visible result.

## Immutable time trie

Finalizing a run that has at least one capture creates an empty, create-only
marker below the selected project's app-owned evidence directory:

```text
_timeline/<17 UTC timestamp digits, one directory per digit>/<run-uuid>.mark
```

The marker contains no mutable aggregate data. It is written before the final
record replacement, so a crash may leave an inert orphan marker but cannot
leave a finalized record that requires an all-directory recovery scan. Readers
accept a marker only when its exact run record is finalized, project-bound,
internally consistent, and still matches the marker's timestamp key.

The fixed ten-way digit alphabet lets an album page walk newest first without
enumerating the project evidence directory. Reads have hard limits on path
probes, marker attempts, same-millisecond leaf entries, returned entries, and
record/image metadata bytes. A bad or overgrown branch therefore hides history
fail-closed instead of creating unbounded main-process work. Cursors are opaque
and strictly exclusive, so a later page cannot repeat the final entry of the
page before it.

The result card's selected run is loaded directly by its UUID and fully
revalidates image bytes. It cannot be crowded out by history and does not
depend on its marker surviving. Album history also hashes descriptor-bound
image bytes before calling an entry checked, under a hard aggregate byte budget
per page; opening an individual picture repeats the complete hash, size,
dimensions, identity, containment, and PNG checks. A budget or trie-probe stop
returns a progressing cursor rather than falsely reporting that history ended.
If a changed file exhausts the page midway through one run, that partial entry
is discarded and the cursor retries the same run with a fresh budget. Every
descriptor read allocates and reads only the size admitted by its checked
`fstat`; a concurrent grow cannot turn a bounded read into a larger one.

## Legacy review shots

`app/shots/manifest.json` remains explicitly untrusted compatibility history.
Its manifest and images are opened through regular, non-link descriptors with
identity and containment checks. Metadata reads take only the fixed PNG header,
but charge each file's entire descriptor size against the aggregate attempted-
byte budget before reading that header. Count, entry, per-image, and aggregate
limits all fail closed. Legacy entries never join the checked timeline and can
never become the result card's evidence pair.

## Persisted truth checks

Stored trusted records are rejected when terminal capture truth contradicts
the disposition, labels are not the label derived from their boundary, capture
IDs collide after case normalization, files are reused, or project/run identity
does not match the directory being read. These checks apply on reload, not only
while a record is being written.
