import React, { createContext, useContext, useState } from 'react';

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
}
const Ctx = createContext<TabsCtx | null>(null);

export const Tabs: React.FC<
  React.PropsWithChildren<{ defaultValue: string; className?: string }>
> = ({ defaultValue, children, className }) => {
  const [value, setValue] = useState(defaultValue);
  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
};

export const TabsList: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div>{children}</div>
);

export const TabsTrigger: React.FC<
  React.PropsWithChildren<{ value: string; className?: string }>
> = ({ value, className = '', children }) => {
  const ctx = useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={`px-3 py-1 text-sm ${active ? 'font-semibold' : 'font-normal'} ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<
  React.PropsWithChildren<{ value: string; className?: string }>
> = ({ value, children, className }) => {
  const ctx = useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
};

export default { Tabs, TabsList, TabsTrigger, TabsContent };
