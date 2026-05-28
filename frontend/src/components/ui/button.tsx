// src/components/ui/button.tsx
import React from 'react';

type Variant = 'default' | 'outline' | 'ghost' | 'link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

// Simple class mapping for variants – you can extend with your design system later.
const variantClasses: Record<Variant, string> = {
  default: 'bg-blue-600 hover:bg-blue-700 text-white',
  outline: 'border border-gray-300 text-gray-200 hover:bg-gray-800',
  ghost: 'bg-transparent text-gray-200 hover:bg-gray-700',
  link: 'text-blue-400 underline hover:text-blue-300',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  className = '',
  children,
  ...rest
}) => {
  const base = 'px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const classes = `${base} ${variantClasses[variant]} ${className}`;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
};
