/**
 * Transparent, non-diagnostic class flag.
 *
 * A class is "Review recommended" only when the last 3 days show at least 3
 * different students with a logged symptom, and that count is at least double
 * the class's own pace from the previous 11 days (scaled to a 3-day slice).
 *
 * Band:
 *   high   — 5 or more students, or at least 40% of the active class
 *   medium — the rule above, or at least 25% of the class
 *   low    — otherwise ("Normal")
 *
 * This never names a disease and never says an outbreak exists.
 */
export function assessClass({ classSize, distinct3d, distinctPrior11d }) {
  const size = Number(classSize) || 0;
  const recent = Number(distinct3d) || 0;
  const prior = Number(distinctPrior11d) || 0;
  const pace = (prior / 11) * 3;
  const share = size > 0 ? recent / size : 0;
  const unusual = recent >= 3 && recent >= Math.max(2, pace * 2);
  const mediumShare = share >= 0.25 && recent >= 3;

  let band = "low";
  if (recent >= 3 && (share >= 0.4 || (recent >= 5 && unusual))) band = "high";
  else if (unusual || mediumShare) band = "medium";

  const reviewRecommended = band !== "low";
  return {
    band,
    reviewRecommended,
    label: reviewRecommended ? "Review recommended" : "Normal",
    distinct3d: recent,
    classSize: size,
    priorPace3d: Number(pace.toFixed(2)),
    reason: reviewRecommended
      ? `${recent} different students logged a symptom in 3 days. The recent pace of this class was ${pace.toFixed(1)}.`
      : "No unusual rise against this class's own recent pace.",
  };
}

export const RISK_DISCLAIMER =
  "Pattern only. This is not a diagnosis and not a statement that an illness is present.";
