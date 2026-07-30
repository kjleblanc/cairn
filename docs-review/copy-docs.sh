#!/usr/bin/bash
# Copy docs from projects with spaces in paths

# RunWithFriends
mkdir -p docs-review/staged/runwithfriends/docs
for f in AGENTS.md CLAUDE.md README.md; do
  path="C:/Users/KenJL/Desktop/WebApp Projects/RunWithFriends/$f"
  if [ -f "$path" ]; then cp "$path" docs-review/staged/runwithfriends/; fi
done
if [ -d "C:/Users/KenJL/Desktop/WebApp Projects/RunWithFriends/docs" ]; then
  cp -r "C:/Users/KenJL/Desktop/WebApp Projects/RunWithFriends/docs/." docs-review/staged/runwithfriends/docs/ 2>/dev/null
fi

# SpecDeck
mkdir -p docs-review/staged/specdeck
for f in Migration_Brief.md spec.json README.md README.rst README; do
  path="C:/Users/KenJL/Desktop/WebApp Projects/SpecDeck/$f"
  if [ -f "$path" ]; then cp "$path" docs-review/staged/specdeck/; fi
done
if [ -d "C:/Users/KenJL/Desktop/WebApp Projects/SpecDeck/docs" ]; then
  cp -r "C:/Users/KenJL/Desktop/WebApp Projects/SpecDeck/docs/." docs-review/staged/specdeck/docs/ 2>/dev/null
fi

# delve top-level files
for f in AGENTS.md CLAUDE.md README.md; do
  path="C:/Users/KenJL/Desktop/Engine Projects/delve/$f"
  if [ -f "$path" ]; then cp "$path" docs-review/staged/delve/; fi
done

# Workflow Docs
mkdir -p docs-review/staged/workflow-docs
for f in PROJECT-CONVERSION.md PROJECT-KICKOFF.md README.md; do
  path="C:/Users/KenJL/Desktop/Workflow Docs/$f"
  if [ -f "$path" ]; then cp "$path" docs-review/staged/workflow-docs/; fi
done
