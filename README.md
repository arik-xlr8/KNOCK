# KNOCK - 256 Tile Prompt Mosaic

**Student:** Yağız Ömür Arık  
**Student Number:** 20190808027
**Web App Link:** https://knock-project.xyz/

## Project Description and Artistic Statement

KNOCK - 256 Tile Prompt Mosaic is an interactive creative AI artwork for CSE 358. The user enters any visual prompt, and the system turns that prompt into a 16x16 CSS mosaic made of 256 animated tiles.

The work responds to the assignment theme, Bob Dylan's "Knockin' on Heaven's Door", by treating the screen as a threshold. A prompt becomes an image, the image becomes sampled color data, and that data becomes a fragile CSS object made of small pieces. The artwork is not a direct illustration of Dylan unless the user chooses that context. Instead, Dylan's world appears as an interpretive layer: doors, burdens, farewells, thresholds, and the historical atmosphere around 1973.

The main artwork is the CSS tile mosaic. The generated image is shown above the artwork notes as a reference layer so the viewer can compare the AI image and the CSS interpretation before reading the contextual explanation.

## Technical Architecture

The current pipeline works like this:

1. The user enters a prompt or chooses one of the prepared song-inspired prompt buttons.
2. The backend sends the prompt to a Pollinations text model.
3. The LLM extracts and normalizes the visual subject from the user's prompt.
4. A Pollinations image model generates a centered pixel-art reference image of that subject.
5. The browser samples the generated image into a 16x16 canvas.
6. The sampled colors and contrast values are rendered as 256 CSS tiles.
7. Optional Dylan context notes connect the subject to threshold, badge/burden, farewell, and 1973 historical context without changing the generated image subject.

The project uses original JavaScript, CSS, and Node.js code. AI is used to interpret the prompt and generate the image reference, while the final mosaic is rendered through custom frontend logic.

## Bob Dylan Song Prompts

The interface includes a Bob Dylan song selector. When a song is selected, lyric-inspired prompt buttons appear. These are not long lyric quotations; they are short visual prompts based on the imagery and themes of the songs.

Examples:

- `Knockin' on Heaven's Door`: heavy badge, glowing door, farewell silhouette
- `Blowin' in the Wind`: wind, dove, open road
- `The Times They Are A-Changin'`: cracked clock, rising wave
- `A Hard Rain's A-Gonna Fall`: rain clouds, storm eye
- `Like a Rolling Stone`: rolling stone, lonely road

## Dylan Context Notes

The `Dylan context notes` iOS-style switch adds an interpretive layer below the image reference. It does not modify the image generation prompt. Instead, it explains how the chosen subject can be read through the assignment's required context: threshold, badge/burden, farewell/mortality, the Vietnam-era anti-war atmosphere, and the western film context of the song.

## AI Techniques Used

1. **LLM-based prompt analysis and contextual interpretation:** A Pollinations text model extracts and normalizes the visual subject. When Dylan context is enabled, it also generates concise artwork notes.
2. **Text-to-image generation:** A Pollinations image model generates the reference image that is sampled into the CSS mosaic.

These two techniques interact directly. The LLM output controls the subject given to the image model, and the image model output becomes the visual data source for the CSS mosaic.

## Installation and Setup

Requirements:

- Node.js 18 or newer
- A modern browser
- Internet connection for Pollinations API calls

Install dependencies:

```bash
npm install
```

Run the project:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

Alternative direct command:

```bash
node server.js
```

If port `3000` is already in use:

```powershell
$env:PORT=3001
npm start
```

Then open:

```text
http://localhost:3001
```

## Shared Hosting Deployment

For PHP-based shared hosting such as Hostinger Business Hosting, upload these files and folders to `public_html`:

- `index.html`
- `style.css`
- `app.js`
- `.htaccess`
- `api/`
- `MANIFESTO.md`
- `README.md`

The live site does not need `node server.js` if PHP is available. The `.htaccess` file routes `/api/design` to `api/design.php` and `/api/image` to `api/image.php`, so the frontend can keep using the same API URLs.

If the page shows an error like `Unexpected token '<'`, the API route is returning an HTML page instead of JSON. In that case, make sure `.htaccess` and the full `api` folder were uploaded to the hosting root.

## Dependencies and API Requirements

The project uses Pollinations by default and does not require a paid API key for the basic workflow.

Runtime dependencies:

- Node.js built-in `http`, `fs`, `path`, and `url` modules
- PHP 7.4 or newer for shared hosting deployment
- Pollinations text API
- Pollinations image API

Optional `.env`:

```env
POLLINATIONS_TEXT_MODEL=openai
POLLINATIONS_IMAGE_MODEL=flux
PORT=3000
```

## Example Outputs

Example prompt:

```text
a glowing door in darkness
```

Expected result:

- The LLM extracts `glowing door` or a similar direct visual subject.
- The image model generates a centered pixel-art door reference.
- The browser samples that reference into a 16x16 grid.
- The final artwork appears as a 256-tile CSS mosaic.
- If Dylan context notes are enabled, the notes connect the door to threshold, farewell, burden, and the historical context of the song.

Suggested screenshots for final submission:

- The full interface with a generated mosaic.
- The generated image reference above the artwork notes.
- The Dylan song prompt buttons and Dylan context switch.

## Files

- `index.html`: User interface
- `style.css`: 256-tile CSS mosaic design, iOS-style switch, and loader overlay
- `app.js`: Frontend rendering, song prompt buttons, Dylan context toggle, and image sampling
- `server.js`: Pollinations text/image API proxy and static server
- `api/`: PHP backend for shared hosting deployment
- `.htaccess`: Apache routes for PHP API endpoints
- `MANIFESTO.md`: Artist's manifesto
- `.env.example`: Environment variable example
