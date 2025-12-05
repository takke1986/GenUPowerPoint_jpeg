import React, { useState } from 'react';
import { BaseProps } from '../@types/common';
import ButtonIcon from './ButtonIcon';
import { PiSpinnerGap, PiX } from 'react-icons/pi';

type Props = BaseProps & {
  src?: string;
  loading?: boolean;
  deleting?: boolean;
  size: 's' | 'm';
  error?: boolean;
  onDelete?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
};

const ZoomUpImage: React.FC<Props> = (props) => {
  const [zoom, setZoom] = useState(false);

  return (
    <div className={props.className}>
      <div className="group relative cursor-pointer">
        {props.selectable && (
          <input
            type="checkbox"
            checked={props.selected}
            onChange={(e) => props.onSelectChange?.(e.target.checked)}
            className="absolute left-1 top-1 z-10 h-4 w-4 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <img
          className={`${
            props.error ? 'border-red-500' : props.selected ? 'border-blue-500 border-2' : 'border-aws-squid-ink/50'
          } bg-aws-squid-ink/20 rounded border object-cover object-center ${
            props.size === 's' ? 'size-24' : 'size-32'
          }`}
          src={props.src}
          onClick={() => {
            if (!props.selectable) {
              setZoom(true);
            }
          }}
        />
        {(props.loading || props.deleting) && (
          <div className="bg-aws-squid-ink/20 absolute top-0 flex h-full w-full items-center justify-center rounded">
            <PiSpinnerGap className="animate-spin text-4xl text-white" />
          </div>
        )}
        {props.onDelete && !props.loading && !props.selectable && (
          <ButtonIcon
            className={`invisible absolute right-0 top-0 m-0.5 border bg-white text-xs group-hover:visible `}
            onClick={props.onDelete}>
            <PiX />
          </ButtonIcon>
        )}
      </div>

      {zoom && (
        <div
          className="fixed left-0 top-0 z-[100] h-screen w-screen bg-gray-900/90"
          onClick={() => {
            setZoom(false);
          }}
        />
      )}
      {zoom && (
        <div
          className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2"
          onClick={() => {
            setZoom(false);
          }}>
          <img src={props.src} className="max-h-[90vh]" />
        </div>
      )}
    </div>
  );
};

export default ZoomUpImage;
