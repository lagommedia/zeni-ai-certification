import { resolveVideoEmbed } from "@/lib/video";
import { TrackedVideo } from "@/components/tracked-video";

export function VideoEmbed({
  url,
  moduleId,
  videoWatched,
}: {
  url: string;
  moduleId: string;
  videoWatched: boolean;
}) {
  const embed = resolveVideoEmbed(url);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-onyx">
      {embed.kind === "file" ? (
        <TrackedVideo moduleId={moduleId} src={embed.url} alreadyWatched={videoWatched} />
      ) : (
        <iframe
          src={embed.embedUrl}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
