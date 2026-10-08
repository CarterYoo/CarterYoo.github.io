"""Read my TFT rank and ranked game count from my tactics.tools profile and write rank.json.

Run by .github/workflows/tft-rank.yml; the site's About card reads the result
from the tft-data branch. Standard library only.
"""

import json
import os
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

NAME, TAG = os.environ.get("RIOT_ID", "ActionableInterp#31415").split("#", 1)
REGION = os.environ.get("TFT_SITE_REGION", "na")
RANKED_QUEUE_ID = "1100"
OUT = pathlib.Path(sys.argv[1])
URL = f"https://tactics.tools/player/{REGION}/{urllib.parse.quote(NAME)}/{urllib.parse.quote(TAG)}"


def fetch_profile():
    req = urllib.request.Request(URL, headers={
        "User-Agent": "Mozilla/5.0 (compatible; carteryoo.github.io rank card; +https://carteryoo.github.io)",
        "Accept": "text/html",
    })
    with urllib.request.urlopen(req, timeout=30) as res:
        html = res.read().decode("utf-8", "replace")
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if not match:
        raise RuntimeError("profile data not found on the page")
    return json.loads(match.group(1))["props"]["pageProps"]["initialData"]


def main():
    data = fetch_profile()
    league = data["playerInfo"].get("rankedLeague") or []
    ranked = data.get("queueSeasonStats", {}).get(RANKED_QUEUE_ID, {})
    current = None
    if len(league) == 2 and league[0]:
        tier, _, division = league[0].partition(" ")
        current = {"tier": tier, "rank": division, "lp": league[1], "games": ranked.get("games", 0)}

    OUT.write_text(json.dumps({
        "riotId": f"{NAME}#{TAG}",
        "source": URL,
        "updated": int(time.time()),
        "current": current,
    }, indent=1) + "\n")


if __name__ == "__main__":
    main()
