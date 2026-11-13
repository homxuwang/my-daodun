# Character source art

The synchronous game atlas is compiled from these authoring sheets:

- `meme-source.png`: the 4×3 baseline sheet. Its `mage` and `knight` cells are superseded.
- `original-pair.png`: the 2×1 sheet. Only the RIGHT cell supplies 泡泡团团 (`knight`). The left human-toddler cell is retired and explicitly skipped by the importer.
- `naiwa-source.png`: the corrected single-character 奶蛙 (`mage`) sheet, based on the yellow pear-bodied, green-eyed internet meme. This overrides the mage slot unconditionally.

奶蛙 has a warm-yellow pear-shaped body, green eye rings, round black pupils, a short mouth, small arms and olive-colored hands/feet. It has no human infant clothes, hair, milk bottle, dragon horns or tail. 泡泡团团 remains an ivory/mint robot with a square glass visor, digital eyes and a bubble tank. All other character art remains intact.

Bake all required sheets:

```bash
node tools/import-meme-art.mjs
npm run check
npm run check:cocos
npm run build:web
```

Optional positional arguments specify the baseline PNG, robot pair PNG, then single 奶蛙 PNG. All override source files are required; rebuilding cannot restore the retired designs.

Chromium fits each sprite into a 48×64 canvas with a shared foot baseline. A maximum of 128 opaque colors plus transparency is encoded into `assets/scripts/MemeArt.ts` as palette/RLE data. Source PNG files remain outside the Cocos assets directory; none is loaded at runtime. Both targets use the same synchronous atlas and three animation states.

Visual references: [Naiwa Hub character gallery](https://naiwahub.com/zh/series/nai-wa). The visual correction is not a verification of commercial authorization.
