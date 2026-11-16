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

Without Node:

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

## Features

- 4 maps: The Yard, Foundry, Cryo Deck, District 9
- 5 weapons: pistol, rifle, shotgun, rocket launcher, Arc Lance
- 7 enemy types including flying drones, bombers and a boss every 5th wave
- Stackable upgrades after every wave
- Explosive barrels, 3 difficulty levels, best score per map

## Controls

| Action | Key |
| --- | --- |
| Move | WASD |
| Look / fire / aim | Mouse / LMB / RMB |
| Sprint | Shift |
| Jump | Space |
| Reload | R |
| Weapons | 1–5 or mouse wheel |
| Pick upgrade | 1 2 3 |
| Pause | Esc / P |
