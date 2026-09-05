# Sector 7: Hostile Takeover

A small retro first-person shooter for desktop and touch browsers. Reclaim three
sectors of a mining outpost, collect weapons and the red keycard, and use each
sector's exit switch.

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
| Weapon | 1–4 or mouse wheel | GUN cycles owned weapons |
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
- Progress is not saved across page reloads.

## Development checks

With Node.js installed:

```sh
node test.cjs
```

The checks execute the actual inline game script in a small mock DOM/canvas
environment. They cover explosion cover (including doors and corners), empty
weapon cooldown, analog movement, focus loss, death/retry transitions, map
reachability, and settings. A rendering smoke check exercises all three levels;
it does not replace a browser or real-device playtest.

Manual checks before releasing: start/pause/resume, map open/close, change settings
and reload, and try simultaneous movement/look/fire on a touch device.

The game remains in `index.html`; map data is in `MAPS`. Tests use only Node's
standard library. Licensed under [MIT](LICENSE).
