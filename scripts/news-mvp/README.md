# Weekly News MVP

This MVP is intentionally Codex-assisted instead of scheduled by GitHub Actions.
Codex or an editor should gather sources, write the weekly brief, run the generator,
and review the draft before publication.

## Generate a draft

```bash
npm run news:mvp
```

Set `NEWS_MVP_REFERENCE_DATE` to test another Taipei-week boundary:

```bash
NEWS_MVP_REFERENCE_DATE=2026-05-18T01:30:00Z npm run news:mvp
```

## Upload myfiles assets

`myfiles` already supports `POST /api/upload` and returns each uploaded file's
`publicUrl`. Put assets under `myfiles-assets/<YYYY-MM-DD_YYYY-MM-DD>/`:

```text
myfiles-assets/2026-05-11_2026-05-17/
  cover.webp
  weekly-world-news.mp4
  un-security-council.webp
```

Then run:

```bash
MYFILES_PUBLIC_BASE=https://files.js.gripe npm run news:mvp:upload-assets -- --week=2026-05-11_2026-05-17
```

The upload helper updates `config/news-mvp.assets.json` with returned public URLs.
If anonymous upload is disabled, pass a browser session cookie with
`MYFILES_SESSION_COOKIE`.

## Text to speech

The video renderer uses the OpenAI-compatible `/v1/audio/speech` endpoint exposed
by `wangwangit/tts` or a self-hosted compatible Worker. WorkerAI TTS is not used.

```bash
NEWS_TTS_ENDPOINT=https://tts.wangwangit.com \
NEWS_TTS_VOICE=zh-CN-YunyangNeural \
NEWS_TTS_STYLE=newscast \
npm run news:mvp:tts -- --input=voiceover.txt --output=voiceover.mp3
```

## Render localized videos

Render one audience version at a time:

```bash
npm run news:mvp:video -- --locale=zh-CN
npm run news:mvp:video -- --locale=zh-TW
npm run news:mvp:video -- --locale=en
```

The renderer writes each version under
`myfiles-assets/<week>/<locale>/`, including the MP4, cover, SRT, VTT,
shotlist, and attribution file. VTT captions are also copied into
`static/news/` so the Astro build can publish them with the article pages.

## Localization and footage policy

For future video editions, localize each language as its own audience version:

- `zh-CN`: write for Singapore Chinese readers and viewers, with Singapore-style
  Simplified Chinese phrasing where it reads naturally.
- `zh-TW`: write for Taiwan readers and viewers, using Taiwan Traditional Chinese
  terminology and tone.
- `en`: write for US readers and viewers, using US English news style.

Use reality-based visuals. Prefer properly licensed, authorized, or publicly
embeddable footage from Reuters, AP, and other international news providers when
available, plus official public-domain footage, original maps, and data animation.
Do not rely only on Wikimedia still images, and do not treat Reuters/AP footage as
free-to-republish unless the project has permission for that specific asset.
