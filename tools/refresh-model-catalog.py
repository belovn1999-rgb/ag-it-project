#!/usr/bin/env python3
"""The monthly refresh of the model catalog in one command (B61 stage 21, owner 2026-10-23).

Each source reads again its list pages older than --days (tools/cache_age.py: model, generation and body pages;
not one version's page), then the table, trims and page data are rebuilt offline, docs/MODEL-CHANGES.md says
what changed against the committed table, and — with --platform — the platform's catalogs are rebuilt too.
Nothing is committed or published: the report is read first (a source that renamed a generation shows up as
"пропали").

Steps (run in this order; --only / --skip by name):
  autocentrum   tools/crawl-autocentrum.py --engines --keep-compared   (1 s a page)
  ultimatespecs tools/generate-model-generations.py + generate-model-engines.py — the 65 compared models;
                tools/crawl-ultimatespecs-models.py — new brands (wave 4) and --check — the second source (30 s a page)
  adac          tools/collect-adac-versions.py, crawl-adac-models.py, collect-adac-extra.py, collect-adac-details.py,
                collect-trims-adac.py (2 s)
  build         tools/build-model-engine-table.py --offline, build-model-trims.py, build-model-specs.py
  report        tools/catalog-changes.py
  platform      <platform>/platform/tools/portals/build-catalogs.mjs <this repo> (only with --platform)

    python3 tools/refresh-model-catalog.py [--days 30] [--only adac,build,report] [--platform ~/cloude/mantexlab-tools-models]

ultimatespecs alone takes about a day (Crawl-delay 30 s); run it detached (nohup … &). One crawler per site at a time.
"""
import argparse
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.expanduser("~/.cache/autogood")
STEPS = {
    "autocentrum": [["tools/crawl-autocentrum.py", "--engines", "--keep-compared"]],
    "ultimatespecs": [
        ["tools/generate-model-generations.py", "--cache", f"{CACHE}/ultimatespecs-models"],
        ["tools/generate-model-engines.py", "--cache", f"{CACHE}/ultimatespecs-bodies"],
        ["tools/crawl-ultimatespecs-models.py"],
        ["tools/crawl-ultimatespecs-models.py", "--check"],
    ],
    "adac": [["tools/collect-adac-versions.py"], ["tools/crawl-adac-models.py"], ["tools/collect-adac-extra.py"],
             ["tools/collect-adac-details.py"], ["tools/collect-trims-adac.py"]],
    "build": [["tools/build-model-engine-table.py", "--offline"], ["tools/build-model-trims.py"],
              ["tools/build-model-specs.py"]],
    "report": [["tools/catalog-changes.py"]],
}


def run(command, env):
    started = time.time()
    print(f"== {' '.join(command)}", flush=True)
    result = subprocess.run([sys.executable, "-u", *command], cwd=ROOT, env=env)
    print(f"   exit {result.returncode}, {int(time.time() - started)} s", flush=True)
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=float, default=30, help="read again list pages older than this")
    parser.add_argument("--only", default="", help="comma-separated steps")
    parser.add_argument("--skip", default="", help="comma-separated steps")
    parser.add_argument("--platform", help="the platform checkout to rebuild the catalogs in")
    args = parser.parse_args()
    env = {**os.environ, "AUTOGOOD_REFRESH_DAYS": str(args.days)}
    only = {s for s in args.only.split(",") if s}
    skip = {s for s in args.skip.split(",") if s}
    failed = []
    for step, commands in STEPS.items():
        if (only and step not in only) or step in skip:
            continue
        for command in commands:
            if not run(command, env):
                failed.append(" ".join(command))
                if step == "build":
                    break  # the page data are not rebuilt over a failed table
    if args.platform and "platform" not in skip and (not only or "platform" in only):
        node = os.path.expanduser("~/cloude/.tools/node/bin/node")
        script = os.path.join(args.platform, "platform/tools/portals/build-catalogs.mjs")
        print(f"== {script}", flush=True)
        if subprocess.run([node, script, ROOT]).returncode != 0:
            failed.append("platform build-catalogs")
        # build-catalogs.mjs also stamps mobile-de.json with today's date: keep the committed one.
        subprocess.run(["git", "-C", args.platform, "checkout", "platform/resources/data/portals/mobile-de.json"])
    print("failed: " + "; ".join(failed) if failed else "all steps done — read docs/MODEL-CHANGES.md before committing")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
