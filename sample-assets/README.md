# Sample Test Assets

Small, generated (not copyrighted) media files for testing the Audio and
Video tabs — useful if you don't have your own audio/video files handy.
Not part of the app itself; just test fixtures.

| File | What it is | Use it to test |
|------|-----------|-----------------|
| `sample-tone.wav` | 4s, 440Hz sine tone, stereo, 44.1kHz | The **Audio** tab — upload, apply effects (try `ECHO` or `WARM LOWPASS`, both are easy to hear on a pure tone), export as WAV |
| `sample-video-with-audio.mp4` | 5s test-pattern video + 330Hz tone audio track | The **Video** tab's audio-track separation — upload it, the sidebar should show an "AUDIO TRACK" panel with its own effect chain, independent from the visual glitch. Export as combined video+audio, video-only, or audio-only to confirm all three paths work |
| `sample-video-no-audio.mp4` | 4s Mandelbrot zoom, no audio track | The **Video** tab's no-audio fallback — the AUDIO TRACK panel should show "(none found)" and the video-only export path, without ever showing audio-only options |

All three were generated with `ffmpeg`'s built-in test-pattern generators
(`sine`, `testsrc2`, `mandelbrot` — synthetic, not sourced from anywhere),
so there's no licensing concern with including them in the repo. Regenerate
or replace them any time with:

```bash
ffmpeg -f lavfi -i "sine=frequency=440:duration=4" -ar 44100 -ac 2 sample-tone.wav

ffmpeg -f lavfi -i "testsrc2=size=640x360:rate=30:duration=5" \
  -f lavfi -i "sine=frequency=330:duration=5" \
  -c:v libx264 -pix_fmt yuv420p -crf 28 -preset veryfast \
  -c:a aac -b:a 96k -shortest sample-video-with-audio.mp4

ffmpeg -f lavfi -i "mandelbrot=size=640x360:rate=30" -t 4 \
  -c:v libx264 -pix_fmt yuv420p -crf 28 -preset veryfast sample-video-no-audio.mp4
```
