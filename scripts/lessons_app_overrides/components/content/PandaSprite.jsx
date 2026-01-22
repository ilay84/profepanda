import correctVideo from "../../assets/icons/lessons/panda-correct.mp4";
import incorrectVideo from "../../assets/icons/lessons/panda-incorrect.mp4";

const FRAME_SIZE = 80;

export default function PandaSprite({ variant }) {
  const src = variant === "correct" ? correctVideo : incorrectVideo;

  return (
    <video
      key={variant}
      src={src}
      autoPlay
      muted
      playsInline
      className="shrink-0"
      style={{ width: `${FRAME_SIZE}px`, height: `${FRAME_SIZE}px` }}
      aria-hidden="true"
    />
  );
}
