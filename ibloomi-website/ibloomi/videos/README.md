# Demo Video

Place your iBloomi demo video file here, named:

```
ibloomi-demo.mp4
```

The hero section on the homepage (`index.html`) is already wired up to play this file in the framed video player on the right side of the hero.

## Recommended specs
- Format: MP4 (H.264 codec) for best browser compatibility
- Aspect ratio: 16:9 (matches the video frame)
- Resolution: 1280×720 or 1920×1080
- Keep file size reasonable (under ~20MB) for fast loading — compress with a tool like HandBrake if needed

## Poster image
A placeholder poster image is used at `images/video-poster.png` (shown before the video plays / while loading). Replace this file with a custom thumbnail/screenshot from your video if you'd like a different preview image — keep the same filename or update the `poster` attribute in `index.html`.

## Optional: hosting elsewhere
If you'd rather host the video externally (e.g. on a CDN, YouTube, or Vimeo) instead of bundling it in the repo, replace the `<video>` element in `index.html`'s hero section with an `<iframe>` embed and update the styling on `.video-frame` accordingly.
