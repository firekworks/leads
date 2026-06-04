import type { CSSProperties } from "react";

type ScoreRingProps = {
  score: number;
  label?: string;
};

export function ScoreRing({ score, label }: ScoreRingProps) {
  return (
    <div
      className="score-ring"
      style={{ "--score": `${score * 3.6}deg` } as CSSProperties}
      aria-label={`Score ${score}`}
    >
      <div>
        <strong>{score}</strong>
        <span>{label || "score"}</span>
      </div>
    </div>
  );
}
