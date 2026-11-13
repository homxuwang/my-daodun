# Meme character source art

`meme-source.png` is the generated authoring sheet for the eleven replacement characters. It uses recognizable meme silhouettes, natural cat fur and expressions, and shaded pixel rendering. The knife-and-shield dog retains its original art.

The sheet has four columns and three rows, in this order:

1. 奶龙、哈基米猫、玛卡巴卡、香蕉猫
2. Happy猫、哭哭猫、波比猫、耄耋猫
3. Pepe青蛙、招财猫、圣诞猫、空白

Bake the source after an art update:

```bash
node tools/import-meme-art.mjs
npm run check
npm run build:web
```

The importer uses Chromium to decode the source, fits each character to a 48×64 canvas with a common foot baseline, and quantizes it to at most 128 opaque colors. It writes palette/RLE data to `assets/scripts/MemeArt.ts`. The source PNG stays outside the Cocos assets directory and is not downloaded at runtime. Both Cocos and browser builds use the same synchronous 1024×1024 generated atlas. Existing character IDs, gameplay sizes and skill mechanics remain intact.

`drawMemeHero` derives the existing three animation states from these baked sprites. To run browser verification, start the preview server and run `npm run test:meme`, optionally setting `GAME_URL` and `CHROME_BIN`.
