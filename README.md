# KNOCK - 256 Tile Prompt Mosaic

KNOCK - 256 Tile Prompt Mosaic is an interactive creative AI project for CSE 358. The user enters any prompt, and the system turns that exact prompt into a 16x16 CSS mosaic made of 256 tiles.

The current pipeline works like this:

1. The LLM extracts the visual subject from the user's prompt.
2. The image model generates a centered pixel-art reference image of that subject.
3. The browser samples the generated image into a 16x16 canvas.
4. The sampled colors and contrast values are rendered as 256 CSS tiles.
5. Optional Dylan context notes connect the subject to threshold, badge/burden, farewell, and 1973 historical context without changing the generated image subject.

The main artwork is the CSS tile mosaic. The generated image is shown above the artwork notes as a reference layer so the viewer can compare the AI image and the CSS interpretation before reading the contextual explanation.

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

## AI Techniques

1. **LLM-based prompt analysis and contextual interpretation:** A Pollinations text model extracts and normalizes the visual subject. When Dylan context is enabled, it also generates concise artwork notes.
2. **Text-to-image generation:** A Pollinations image model generates the reference image that is sampled into the CSS mosaic.

## How To Run

From the project folder:

```bash
node server.js
```

Then open:

```text
http://localhost:3000
```

If port `3000` is already in use:

```powershell
$env:PORT=3001
node server.js
```

Then open:

```text
http://localhost:3001
```

## Free API Configuration

The project uses Pollinations by default and does not require an API key for the basic workflow.

Optional `.env`:

```env
POLLINATIONS_TEXT_MODEL=openai
POLLINATIONS_IMAGE_MODEL=flux
PORT=3000
```

## Files

- `index.html`: User interface
- `style.css`: 256-tile CSS mosaic design and loader overlay
- `app.js`: Frontend rendering, song prompt buttons, and image sampling
- `server.js`: Pollinations text/image API proxy and static server
- `MANIFESTO.md`: Artist's manifesto
- `.env.example`: Environment variable example
