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
