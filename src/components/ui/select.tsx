import React, { createContext, useContext, useState } from 'react';

interface Ctx {
  value: string | undefined;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const SelectCtx = createContext<Ctx | null>(null);

export const Select: React.FC<React.PropsWithChildren<{ value?: string; onValueChange?: (v: string) => void }>> = ({ value, onValueChange, children }) => {
  const [val, setVal] = useState<string | undefined>(value);
  const [open, setOpen] = useState(false);
  const setValue = (v: string) => {
    setVal(v);
    onValueChange?.(v);
    setOpen(false);
  };
  return <SelectCtx.Provider value={{ value: val, setValue, open, setOpen }}>{children}</SelectCtx.Provider>;
};

export const SelectTrigger: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => {
  const ctx = useContext(SelectCtx)!;
  return (
    <button className={className} onClick={() => ctx.setOpen(!ctx.open)}>
      {children}
    </button>
  );
};

export const SelectContent: React.FC<React.PropsWithChildren> = ({ children }) => {
  const ctx = useContext(SelectCtx)!;
  if (!ctx.open) return null;
  return <div style={{ border: '1px solid #e5e7eb', background: '#fff' }}>{children}</div>;
};

export const SelectItem: React.FC<React.PropsWithChildren<{ value: string }>> = ({ value, children }) => {
  const ctx = useContext(SelectCtx)!;
  return (
    <div style={{ padding: 4, cursor: 'pointer' }} onClick={() => ctx.setValue(value)}>
      {children}
    </div>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = useContext(SelectCtx)!;
  return <span>{ctx.value ?? placeholder ?? '请选择'}</span>;
};

export default { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };

