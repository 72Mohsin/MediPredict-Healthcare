// video-react package not included — stub component
export function VideoPlayer({ src }: { src: string }) {
  return (
    <video controls className="w-full rounded-lg">
      <source src={src} />
    </video>
  );
}
