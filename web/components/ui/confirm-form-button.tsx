'use client';

import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';

type Props = ComponentProps<typeof Button> & {
  confirmMessage: string;
};

export function ConfirmFormButton({ confirmMessage, onClick, children, ...buttonProps }: Props) {
  return (
    <Button
      {...buttonProps}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </Button>
  );
}
