import React from 'react';

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  className = '',
  icon
}) => {
  let baseStyle = 'inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  
  let variantStyle = 'bg-primary text-on-primary hover:bg-primary-container shadow-md hover:shadow-lg';
  if (variant === 'secondary') {
    variantStyle = 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white hover:bg-surface-container dark:hover:bg-slate-700 border border-outline-variant/60 dark:border-slate-700 shadow-xs hover:shadow-sm';
  } else if (variant === 'outline') {
    variantStyle = 'border border-primary text-primary hover:bg-primary/10 hover:border-primary-container';
  } else if (variant === 'danger') {
    variantStyle = 'bg-error text-on-error hover:bg-red-700 shadow-md hover:shadow-lg';
  } else if (variant === 'ghost') {
    variantStyle = 'text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-surface-container-low dark:hover:bg-slate-800';
  }

  let sizeStyle = 'px-4 py-2 text-xs rounded-full';
  if (size === 'sm') {
    sizeStyle = 'px-3 py-1.5 text-xs rounded-full';
  } else if (size === 'lg') {
    sizeStyle = 'px-6 py-3 text-sm rounded-full';
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[18px] mr-1.5">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
