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

export const TabsList: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={className}>{children}</div>
);

export const TabsTrigger: React.FC<
  React.PropsWithChildren<{ value: string; className?: string }>
> = ({ value, className = '', children }) => {
  const ctx = useContext(Ctx)!;
  const active = ctx.value === value;
  
  // 基础样式
  const baseStyles = 'px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer rounded-md';
  
  // 根据 active 状态应用不同样式
  let finalClassName;
  if (active) {
    // 激活状态：白色背景，深蓝色文字
    finalClassName = `${baseStyles} bg-white text-blue-700 shadow-sm border border-blue-200`;
  } else {
    // 非激活状态：透明背景，灰色文字，悬停效果
    finalClassName = `${baseStyles} bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900`;
  }
  
  // 如果有自定义 className，完全覆盖
  if (className.trim()) {
    finalClassName = className;
  }
  
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={finalClassName}
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
