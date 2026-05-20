const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function extractVideoId(raw: string): string | null {
  const input = String(raw || '').trim();
  if (!input) return null;
  if (YOUTUBE_ID_REGEX.test(input)) return input;

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && YOUTUBE_ID_REGEX.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = url.searchParams.get('v');
      if (v && YOUTUBE_ID_REGEX.test(v)) return v;

      const parts = url.pathname.split('/').filter(Boolean);
      const liveIdx = parts.indexOf('live');
      if (liveIdx >= 0 && parts[liveIdx + 1] && YOUTUBE_ID_REGEX.test(parts[liveIdx + 1])) {
        return parts[liveIdx + 1];
      }
      const embedIdx = parts.indexOf('embed');
      if (embedIdx >= 0 && parts[embedIdx + 1] && YOUTUBE_ID_REGEX.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function parseYouTubeVideoInput(input: unknown): { videoId: string } | null {
  const videoId = extractVideoId(String(input || ''));
  return videoId ? { videoId } : null;
}

export function buildYouTubeUrls(videoId: string) {
  const id = String(videoId || '').trim();
  return {
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}
