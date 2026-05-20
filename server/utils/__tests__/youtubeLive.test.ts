import { describe, expect, it } from 'vitest';
import { buildYouTubeUrls, parseYouTubeVideoInput } from '../youtubeLive';

describe('parseYouTubeVideoInput', () => {
  it('parses bare video ids', () => {
    expect(parseYouTubeVideoInput('dQw4w9WgXcQ')).toEqual({ videoId: 'dQw4w9WgXcQ' });
  });

  it('parses watch URLs', () => {
    expect(parseYouTubeVideoInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
    });
  });

  it('parses youtu.be URLs', () => {
    expect(parseYouTubeVideoInput('https://youtu.be/dQw4w9WgXcQ')).toEqual({ videoId: 'dQw4w9WgXcQ' });
  });

  it('rejects invalid input', () => {
    expect(parseYouTubeVideoInput('not-a-url')).toBeNull();
  });
});

describe('buildYouTubeUrls', () => {
  it('builds watch, embed, and thumbnail URLs', () => {
    expect(buildYouTubeUrls('dQw4w9WgXcQ')).toEqual({
      watchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
  });
});
