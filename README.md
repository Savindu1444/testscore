# Cricket Live Server

Gives OBS Studio and vMix a **separate overlay address for every graphic**, fed live by the scoring page.
Needs only **Node.js 18 or newer**. No install step, no packages.

## Run
    node server.js
(Windows: double-click `start.bat`.)

Open the scoring page at `http://localhost:4000/` (shown when the server starts) and score as usual.
The **Broadcast** tab shows a green "Local server connected" line and the list of overlay links.

## OBS Studio
1. Sources → **+** → **Browser**.
2. URL: one overlay link, for example `http://localhost:4000/overlay/scoreboard`
3. Width/Height: `1920` × `1080` (or the size you chose). Leave the custom CSS box empty. The background is transparent.
4. Tick **Refresh browser when scene becomes active** so the entrance animation plays every time the graphic appears.
5. Add each graphic as its own source and show/hide it, or put it in its own scene, with OBS. **You choose what is on air in OBS.**

## vMix
1. Add Input → **Web Browser**. URL = one overlay link. Size 1920×1080.
2. Add one input per graphic, then put the one you want on air to Output (or use an overlay channel).
3. Live score values for vMix Data Sources / titles: `http://localhost:4000/api/fields.json`

## One link per graphic
    /overlay/scoreboard          /overlay/target (chase)      /overlay/partner
    /overlay/batter              /overlay/bowler
    /overlay/matchsum            /overlay/result              /overlay/custom
    /overlay/batcard?inn=1..4    /overlay/bowlcard?inn=1..4   /overlay/inningsum?inn=1..4
    /overlay/wagon?inn=1..4      /overlay/zones?inn=1..4      (wagon wheel; 8-zone % of runs)

Options (add to any link, e.g. `?size=1280x720&c1=0b2a4a`):
`size=1280x720` · `c1=` main colour (hex, no #) · `c2=` accent colour · `batter=Name` · `bowler=Name` · `wagon=Name` or `wagon=*` (wagon wheel / zones: one batter or everyone) · `bg=green` (chroma key background instead of transparent)

## Public pages (no sign-in)
    /live            list of matches being scored
    /live/<id>       live score page for one match (score, batters, commentary, full scorecard)
These update automatically from the scoring page and are readable on phones. Share the address with anyone on your network.

If you leave colours and size off, they follow the Broadcast tab, and every overlay updates when you change them.
An overlay shows nothing until a match is open in the scoring page, and shows nothing for an innings that has not started.

## Notes
- The overlay shows the match that is currently open in the scoring page.
- Matches are saved in the scoring page's browser (not on the server). Keep using the same browser and address (`http://localhost:4000/`).
- The server listens on your whole network. Use it on a trusted network, or `HOST=127.0.0.1 node server.js` for this computer only.
- Other settings: `PORT=5000 node server.js`.
