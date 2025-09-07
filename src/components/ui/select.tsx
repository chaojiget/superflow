import React, { createContext, useContext, useState } from 'react';

interface Ctx {
  value: string | undefined;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const SelectCtx = createContext<Ctx | null>(null);

export const Select: React.FC<
  React.PropsWithChildren<{
    value?: string;
    onValueChange?: (v: string) => void;
  }>
> = ({ value, onValueChange, children }) => {
  const [val, setVal] = useState<string | undefined>(value);
  const [open, setOpen] = useState(false);
  const setValue = (v: string) => {
    setVal(v);
    onValueChange?.(v);
    setOpen(false);
  };
  return (
    <SelectCtx.Provider value={{ value: val, setValue, open, setOpen }}>
      {children}
    </SelectCtx.Provider>
  );
};

export const SelectTrigger: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, className = '', ...props }) => {
  const ctx = useContext(SelectCtx)!;
  return (
    <button
      className={`inline-flex items-center justify-between px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 ${className}`}
      onClick={() => ctx.setOpen(!ctx.open)}
      {...props}
    >
      {children}
    </button>
  );
};

export const SelectContent: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const ctx = useContext(SelectCtx)!;
  if (!ctx.open) return null;
  return (
    <div className="mt-1 rounded-md border border-gray-200 bg-white shadow-sm">
      {children}
    </div>
  );
};

export const SelectItem: React.FC<
  React.PropsWithChildren<{ value: string }>
> = ({ value, children }) => {
  const ctx = useContext(SelectCtx)!;
  return (
    <div
      className="cursor-pointer px-2 py-1 text-sm hover:bg-gray-100"
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </div>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({
  placeholder,
}) => {
  const ctx = useContext(SelectCtx)!;
  return <span>{ctx.value ?? placeholder ?? '请选择'}</span>;
};

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = '', children, ...props }, ref) => (
  <select
    ref={ref}
    className={`px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white ${className}`}
    {...props}
  >
    {children}
  </select>
));
NativeSelect.displayName = 'NativeSelect';

export default {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  NativeSelect,
};
