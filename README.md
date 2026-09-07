# Sector 7: Hostile Takeover

A small retro first-person shooter for desktop and touch browsers. Reclaim six
sectors of a mining outpost across two chapters. The original campaign leads into
**Blackout Protocol**, where powered machinery and escaped specimens guard a living reactor.

[Play on GitHub Pages](https://dagron78.github.io/Sector_7/)

## Run locally

Open `index.html` directly, or serve this folder:

```sh
python3 -m http.server 8000
```

Visit http://localhost:8000. There is no build step or package installation.
The game uses Canvas 2D and Web Audio, with procedurally generated graphics and
sound. Desktop mouse look requires browser pointer-lock support.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | W/A/S/D | Drag left thumb |
| Look | Mouse; arrow keys also turn/look | Drag right thumb |
| Fire | Left click | Hold FIRE |
| Weapon | 1–5 or mouse wheel | GUN cycles owned weapons |
| Sprint | Shift | Push movement stick beyond 78% |
| Door / exit | E | USE |
| Automap (pauses) | Tab or M | MAP |
| Pause | Esc | II |

Touch movement has a small dead zone and proportional walking speed. Landscape
orientation is recommended on phones. Leaving the page clears held controls and
pauses gameplay.

## Settings

Open SETTINGS from the title or pause screen. Set volume to zero to mute, adjust
look sensitivity (0.25–3×), or choose automatic, touch, or keyboard/mouse controls.
Preferences are saved locally when browser storage is available. Automatic mode
uses the browser's coarse-pointer preference; the manual override supports hybrid
devices.

## Gameplay rules

- Walls and closed doors block explosion damage to both players and enemies.
  Open doors allow damage through; visibility uses the same door-open threshold
  as combat line of sight.
- Retrying restores health, armor, weapons, and ammunition from the start of
  that sector. Pickups and enemies reset; retries cannot accumulate supplies.
- Health, armor, weapons, and ammunition carry into the next sector. Keys reset.
- The sidearm has unlimited ammunition. Empty weapons play a rate-limited click.
- Boomstick deals up to 78 damage across nine pellets. Thumper explosions deal
  up to 99 damage, decreasing with distance from the blast.
- Each weapon has its own shot animation: gold sidearm tracers, orange Boomstick
  pellets, cyan Ripper streaks, and a fading Thumper exhaust trail. Tracers are
  cosmetic: bullet damage remains immediate, while rockets retain travel time.
- Sector-entry checkpoints are saved locally, including health, armor, weapons,
  and ammunition. CONTINUE restores the start of that sector; puzzles, enemies,
  and portals reset. This is not a mid-level save. Storage must be available.

## Blackout Protocol

Play through the original three sectors or choose **BLACKOUT PROTOCOL · CHAPTER II**
from the title to start at Freight Graveyard with the four combat weapons.
Each sector opens with an illustrated briefing explaining the enemies and objects
you will encounter. The title/pause **FIELD GUIDE** repeats these introductions.
The automap shows the current objective and known machinery markers.

| Sector | Objective and mechanics |
| --- | --- |
| Freight Graveyard | Route power from lighting to cargo handling to move container gates. Lure the armored Bulwark onto the Pressure Plate, or shoot the bypass Conduit. Viewing windows block movement and gunfire. |
| Cold Storage | Choose containment or security. Security opens specimen pens and activates sentries; containment provides another route and disables sentries. Destroy the Cryo Conduit to unlock the exit. |
| The Buried Engine | Power reactor access, sever three Shield Relays, and defeat the Warden. Coolant reduces damage from its telegraphed floor surges. |

Consistent objects: **Power Switch** (cyan lightning, USE), **Conduit** (orange
cables, SHOOT), **Shield Relay** (purple ring, USE), **Pressure Plate** (gold floor
square), **Surge Tile** (yellow warning, red danger), and **Service Vent**
(scratched gray slats, USE for optional supplies).

The **Bulwark** has frontal armor and a vulnerable green rear core; bait its
charge and flank it during recovery. The glowing **Leech** drains circuits for
six seconds; killing it restores power. A **Splitter** bursts into three fast
**Crawlers**. The rooted **Warden** alternates plasma volleys with floor warnings
and accelerates below 40% health. Fixed **Sentries** are disabled by their conduit.

The freight pressure lock stays open once activated. A heavy enemy's corpse can
activate it; if all heavies die elsewhere, standing on the plate for three seconds
activates a manual override. Its conduit bypass also works with the unlimited-ammo
Sidearm. Required puzzles cannot be broken by exhausting finite ammunition.

### Portal Gun

Pick up the blue-and-amber projector near the Freight Graveyard entrance; select
**5** or cycle to **PORTAL GUN**. Fire at an ordinary wall within 18 units to place
a blue portal, then fire elsewhere to place amber. Walk into either ring to emerge
from its partner, facing away from the destination wall. Subsequent shots replace
the next color shown on the HUD. Leave the destination ring before re-entering it.

Linked portals show a live view of the destination. Sidearm, Boomstick, Thumper,
and rocket shots travel through them, as do enemy projectiles. Destination walls
still block shots. Nested portal views stay opaque and shot traversal is capped
to prevent infinite loops. Enemy ranged bolts have bright cores and colored trails:
green for ordinary plasma, orange for sentries, and purple for the Warden.
They require clear floor space and cannot be placed on doors, glass, switches,
conduits, relays, vents, or exits. They do no damage and use no ammunition.
They reset on sector entry/retry; ownership carries forward once the pickup has
been acquired and the next sector checkpoint is saved.

## Development checks

With Node.js installed:

```sh
node test.cjs
```

The checks execute the actual inline game script in a small mock DOM/canvas
environment. They cover explosion cover (including doors and corners), empty
weapon cooldown, analog movement, focus loss, death/retry transitions, map
reachability, machinery modes and bypasses, new enemy behaviors, boss shield and
surge timing, checkpoint validation, briefings, portal placement/traversal, live-view clipping, shots through straight and rotated
portals, destination cover, projectile trails, bounded portal loops, and settings. A rendering smoke check exercises all six levels;
it does not replace a browser or real-device playtest.

Manual checks before releasing: start/pause/resume, map open/close, change settings
and reload, and try simultaneous movement/look/fire on a touch device.

The game remains in `index.html`; map data is in `MAPS`. Tests use only Node's
standard library. Licensed under [MIT](LICENSE).
