# BREACH

Arena survival FPS that runs in the browser. No build step, no dependencies.

## Run on a Linux server

Everything is static and self-contained (three.js is bundled in `vendor/`), so any web server works.

Quickest, with Node (no dependencies):

```bash
git clone https://github.com/AreaMonster/breach.git
cd breach
node server.js              # http://<server-ip>:8080
PORT=3000 node server.js    # different port
```

Without Node (no leaderboard):

```bash
python3 -m http.server 8080
```

Run it as a service (edit the paths in `breach.service` first):

```bash
sudo cp -r . /opt/breach
sudo cp breach.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now breach
```

Behind nginx, either proxy to the Node server or serve the folder directly:

```nginx
server {
    listen 80;
    server_name breach.example.com;
    root /opt/breach;
    index index.html;
    location ~ /\. { deny all; }
}
```

Open the port in your firewall if needed, e.g. `sudo ufw allow 8080/tcp`.

## Leaderboard

`server.js` keeps a top-50 list per map and mode and the game shows it on the menu and after each run. Set your name under Settings → Callsign.

- Scores are stored in `data/scores.json` (override with `SCORES_FILE=/path/scores.json`). The systemd unit uses `/var/lib/breach/scores.json`.
- The leaderboard only appears when the game is served by `server.js`. With `python3 -m http.server` or plain nginx file serving it stays hidden; proxy nginx to the Node server instead (`proxy_pass http://127.0.0.1:8080;`).
- Scores are reported by the browser, so they can be faked. The server only validates format, rate-limits submissions and rejects implausible values.

## Features

- 7 maps, each with its own textures, sky, scenery, weather and lighting: The Yard (dusk shipyard), Foundry (steelworks), Cryo Deck (ice shelf under an aurora), District 9 (neon city in the rain), Reactor (energy core), Outpost (desert fort at noon), The Vault (indoor server hall)
- Jump pads, sliding cover, lava, explosive barrels, and doors that swap the layout each wave
- 2 modes: Survival (endless waves) and Blitz (3-minute score attack)
- 5 weapons, each with an upgrade dropped by bosses, plus melee and grenades
- 9 enemy types, shielded elites, and 3 bosses that rotate every 5th wave
- Wave modifiers (Swarm, Low Gravity, Bomb Squad, Blackout, Armored)
- Stackable upgrades after every wave, including rare ones
- Dash, slide, double jump, 3 difficulty levels
- Settings: sensitivity, FOV, volume, graphics quality, key rebinding

## Controls (defaults, all rebindable)

| Action | Key |
| --- | --- |
| Move | WASD |
| Look / fire / aim | Mouse / LMB / RMB |
| Sprint | Left Shift |
| Jump | Space |
| Dash / slide | Q / C |
| Melee / grenade | V / G |
| Reload | R |
| Weapons | 1–5 or mouse wheel |
| Pick upgrade | 1 2 3 |
| Pause | Esc / P |
