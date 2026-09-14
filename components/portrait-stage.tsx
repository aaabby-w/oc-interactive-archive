import { siteCopy } from "@/content/site";

type PortraitStageProps = { nameZh: string; nameEn?: string };

export function PortraitStage({ nameZh, nameEn }: PortraitStageProps) {
  return (
    <figure className="portrait-stage">
      <div className="orbit orbit-a" aria-hidden="true" />
      <div className="orbit orbit-b" aria-hidden="true" />
      <div className="portrait-aperture">
        <div className="portrait-scan" aria-hidden="true" />
        <div className="portrait-empty">
          <span>{siteCopy.home.mediaLabel}</span>
          <small>{siteCopy.home.waitingEn}</small>
        </div>
      </div>
      <figcaption>
        <span className="portrait-number">01</span>
        <span><b>{nameZh}</b><small>{nameEn}</small></span>
        <em>{siteCopy.home.mediaNote}</em>
      </figcaption>
    </figure>
  );
}
