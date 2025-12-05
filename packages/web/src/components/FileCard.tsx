import React from 'react';
import { BaseProps } from '../@types/common';
import ButtonIcon from './ButtonIcon';
import { PiFile, PiSpinnerGap, PiX } from 'react-icons/pi';

type Props = BaseProps & {
  filename?: string;
  url?: string;
  loading?: boolean;
  deleting?: boolean;
  size: 's' | 'm';
  error?: boolean;
  onDelete?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
};

const FileCard: React.FC<Props> = (props) => {
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
        <div
          className={`${
            props.error ? 'border-red-500' : props.selected ? 'border-blue-500 border-2' : 'border-aws-squid-ink/50'
          } max-w-36 break-all rounded border object-cover object-center p-1 ${
            props.size === 's' ? 'max-h-24' : 'max-h-32'
          }`}>
          <PiFile className="mb-1 mr-1 inline size-4" />
          {props.url ? (
            <a href={props.url}>{props.filename}</a>
          ) : (
            props.filename
          )}
        </div>
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
    </div>
  );
};

export default FileCard;
