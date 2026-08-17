import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  getSubtitleAnimationTransform,
  type SubtitleWordDrawCommand,
  type ResolvedSubtitleRenderStyle,
  type ResolvedTextOverlayRenderStyle,
  type SubtitleAnimation,
} from "@qg/subtitle-composition";
import { buildCanvasFont } from "./subtitleCanvasFonts.js";

function drawTextWithGlow(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  style: {
    fontFamily: string;
    fontWeight: number;
    fontSize: number;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    glowColor: string;
    glowIntensity: number;
    glowSpread: number;
    letterSpacing?: number;
  },
  opacity: number,
): void {
  const font = buildCanvasFont(style.fontWeight, style.fontSize, style.fontFamily);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (style.letterSpacing && style.letterSpacing > 0) {
    ctx.letterSpacing = `${style.letterSpacing}px`;
  } else {
    ctx.letterSpacing = "0px";
  }

  const glowVisible = style.glowIntensity > 0 && style.glowSpread > 0;

  if (glowVisible) {
    ctx.save();
    ctx.globalAlpha = (style.glowIntensity / 100) * opacity;
    ctx.filter = `blur(${Math.max(1, style.glowSpread * 0.35)}px)`;
    ctx.lineWidth = style.strokeWidth + style.glowSpread;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = style.glowColor;
    ctx.fillStyle = "transparent";
    ctx.strokeText(text, x, y);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineWidth = style.strokeWidth;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = style.strokeColor;
  ctx.fillStyle = style.fillColor;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawAnimatedText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  style: {
    fontFamily: string;
    fontWeight: number;
    fontSize: number;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    glowColor: string;
    glowIntensity: number;
    glowSpread: number;
    letterSpacing?: number;
  },
  animation: SubtitleAnimation,
  animationElapsedSec: number,
  baseOpacity: number,
  shouldAnimate: boolean,
): void {
  const transform = shouldAnimate
    ? getSubtitleAnimationTransform(animation, animationElapsedSec)
    : { scale: 1, translateX: 0, translateY: 0, opacity: 1 };

  ctx.save();
  ctx.translate(x + transform.translateX, y + transform.translateY);
  ctx.scale(transform.scale, transform.scale);
  drawTextWithGlow(
    ctx,
    text,
    0,
    0,
    style,
    baseOpacity * transform.opacity,
  );
  ctx.restore();
}

export function drawSubtitleWord(
  ctx: SKRSContext2D,
  word: SubtitleWordDrawCommand,
  style: ResolvedSubtitleRenderStyle,
): void {
  drawAnimatedText(
    ctx,
    word.text,
    word.x,
    word.y,
    style,
    word.animation,
    word.animationElapsedSec,
    word.opacity,
    word.shouldAnimate,
  );
}

export function drawTextOverlayCommand(
  ctx: SKRSContext2D,
  command: {
    text: string;
    x: number;
    y: number;
    style: ResolvedTextOverlayRenderStyle;
    animation: SubtitleAnimation;
    animationElapsedSec: number;
  },
): void {
  drawAnimatedText(
    ctx,
    command.text,
    command.x,
    command.y,
    command.style,
    command.animation,
    command.animationElapsedSec,
    1,
    true,
  );
}

export function clearSubtitleCanvas(ctx: SKRSContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
