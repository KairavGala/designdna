import React from 'react';
import type { UploadedImage } from '../../types/upload';
import {
  formatAspectRatio,
  formatFileSize,
  getImageOrientation
} from '../../utils/imageValidation';

export interface ImageMetadataProps {
  image: UploadedImage;
}

export const ImageMetadata: React.FC<ImageMetadataProps> = ({ image }) => {
  const orientation = getImageOrientation(image.width, image.height);

  const items = [
    { label: 'Filename', value: image.name, mono: true, truncate: true },
    { label: 'Format', value: image.format, mono: true },
    { label: 'File Size', value: formatFileSize(image.size), mono: true },
    { label: 'Width', value: `${image.width} px`, mono: true },
    { label: 'Height', value: `${image.height} px`, mono: true },
    {
      label: 'Aspect Ratio',
      value: `${formatAspectRatio(image.width, image.height)} · ${orientation}`,
      mono: true
    }
  ];

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd
            title={item.value}
            className={[
              'mt-1 text-[13px] font-medium text-ink tabular-nums',
              item.mono ? 'font-mono' : '',
              item.truncate ? 'truncate' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};
