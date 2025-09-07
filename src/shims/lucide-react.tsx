import React from 'react';

const icon = (name: string) =>
  function Icon(props: React.HTMLAttributes<HTMLSpanElement>) {
    return (
      <span
        aria-label={name}
        {...props}
        style={{ display: 'inline-block', width: 16, height: 16 }}
      />
    );
  };

export const Check = icon('check');
export const X = icon('x');
export const Play = icon('play');
export const Pause = icon('pause');
export const RotateCcw = icon('rotate-ccw');
export const FlaskConical = icon('flask-conical');
export const Bug = icon('bug');
export const Braces = icon('braces');
export const UploadCloud = icon('upload-cloud');
export const Share2 = icon('share-2');
export const Link2 = icon('link-2');
export const Boxes = icon('boxes');
export const Timer = icon('timer');
export const Cpu = icon('cpu');
export const Zap = icon('zap');
export const Save = icon('save');
export const Wand2 = icon('wand-2');
export const Undo2 = icon('undo-2');
export const FileDiff = icon('file-diff');
export const Download = icon('download');
export const ChevronLeft = icon('chevron-left');
export const ChevronRight = icon('chevron-right');
export const Loader2 = icon('loader-2');

export default {};
