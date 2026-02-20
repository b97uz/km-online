"use client";

type ConfirmSubmitButtonProps = {
  label: string;
  message: string;
  className?: string;
};

export function ConfirmSubmitButton({ label, message, className }: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}

