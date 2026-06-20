'use client';

import { Button, type ButtonProps } from '@/components/ui/button';

type Props = ButtonProps & {
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
