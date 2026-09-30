import { Play } from 'lucide-react';
import { useState } from 'react';

type VideoEmbedProps = {
  title: string;
  youtubeId?: string;
  poster?: string;
  videoSrc?: string;
  fallbackHref?: string;
};

export default function VideoEmbed({ title, youtubeId, poster, videoSrc, fallbackHref = '/viewer' }: VideoEmbedProps) {
  const [loadYouTube, setLoadYouTube] = useState(false);

  if (youtubeId) {
    return (
      <div className="relative aspect-video overflow-hidden border border-white/15 bg-blueprint">
        {loadYouTube ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoadYouTube(true)}
            className="group absolute inset-0 grid h-full w-full place-items-center bg-cover bg-center text-white"
            style={poster ? { backgroundImage: `linear-gradient(rgba(30,58,95,.38),rgba(30,58,95,.58)),url(${poster})` } : undefined}
            aria-label={`Play ${title}`}
          >
            <span className="grid h-16 w-16 place-items-center rounded bg-orange shadow-xl transition group-hover:scale-105 group-hover:bg-[#a94718]">
              <Play className="ml-1 h-7 w-7" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
    );
  }

  if (videoSrc) {
    return (
      <div className="aspect-video overflow-hidden border border-white/15 bg-blueprint">
        <video className="h-full w-full object-cover" controls preload="none" poster={poster} playsInline>
          <source src={videoSrc} type="video/mp4" />
          <a href={videoSrc}>Open the {title} video</a>
        </video>
      </div>
    );
  }

  return (
    <a
      href={fallbackHref}
      className="group relative grid aspect-video place-items-center overflow-hidden border border-white/15 bg-blueprint/60 p-8 text-center"
      style={poster ? { backgroundImage: `linear-gradient(rgba(30,58,95,.72),rgba(30,58,95,.72)),url(${poster})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
      aria-label={`${title}. Open the interactive 3D viewer.`}
    >
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded bg-orange text-white transition group-hover:bg-[#a94718]">
          <Play className="ml-1 h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-5 font-display text-3xl font-bold uppercase">Interactive 3D viewer</p>
        <p className="mt-2 text-white/70">Open a model and walk through it in your browser.</p>
      </div>
    </a>
  );
}
