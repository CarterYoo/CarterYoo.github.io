"""Fetch my TFT rank and recent placements from the Riot API and write rank.json.

Run by .github/workflows/tft-rank.yml; the site's About card reads the result
from the tft-data branch. Standard library only.
"""

import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

KEY = os.environ["RIOT_API_KEY"]
NAME, TAG = os.environ.get("RIOT_ID", "ActionableInterp#31415").split("#", 1)
PLATFORM = os.environ.get("TFT_PLATFORM", "na1")
REGION = os.environ.get("TFT_REGION", "americas")
RANKED_QUEUE_ID = 1100
OUT = pathlib.Path(sys.argv[1])


def get(url):
    for _ in range(4):
        req = urllib.request.Request(url, headers={"X-Riot-Token": KEY, "User-Agent": "carteryoo.github.io rank card"})
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                return json.load(res)
        except urllib.error.HTTPError as err:
            if err.code == 429:
                time.sleep(int(err.headers.get("Retry-After", "5")))
                continue
            raise
    raise RuntimeError(f"rate limited: {url}")


def main():
    previous = json.loads(OUT.read_text()) if OUT.exists() else {}
    q = urllib.parse.quote
    account = get(f"https://{REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{q(NAME)}/{q(TAG)}")
    puuid = account["puuid"]

    entries = get(f"https://{PLATFORM}.api.riotgames.com/tft/league/v1/by-puuid/{puuid}")
    ranked = next((e for e in entries if e.get("queueType") == "RANKED_TFT"), None)
    current = None
    if ranked:
        current = {
            "tier": ranked["tier"],
            "rank": ranked["rank"],
            "lp": ranked["leaguePoints"],
            "wins": ranked.get("wins", 0),
            "losses": ranked.get("losses", 0),
        }

    now = int(time.time())
    history = previous.get("history", [])
    if current:
        last = history[-1] if history else None
        if not last or any(last[k] != current[k] for k in ("tier", "rank", "lp")):
            history.append({"t": now, "tier": current["tier"], "rank": current["rank"], "lp": current["lp"]})
    history = history[-1000:]

    known = {m["id"]: m for m in previous.get("matches", [])}
    ids = get(f"https://{REGION}.api.riotgames.com/tft/match/v1/matches/by-puuid/{puuid}/ids?count=20")
    for match_id in ids:
        if match_id in known:
            continue
        info = get(f"https://{REGION}.api.riotgames.com/tft/match/v1/matches/{match_id}")["info"]
        me = next(p for p in info["participants"] if p["puuid"] == puuid)
        known[match_id] = {
            "id": match_id,
            "t": int(info["game_datetime"]) // 1000,
            "placement": me["placement"],
            "ranked": info.get("queue_id") == RANKED_QUEUE_ID,
        }
    matches = sorted(known.values(), key=lambda m: m["t"], reverse=True)[:40]

    OUT.write_text(json.dumps({
        "riotId": f"{NAME}#{TAG}",
        "updated": now,
        "current": current,
        "history": history,
        "matches": matches,
    }, indent=1) + "\n")


if __name__ == "__main__":
    main()
