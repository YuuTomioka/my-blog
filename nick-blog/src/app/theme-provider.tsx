"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";

/** next-themes を使ったアプリ全体のテーマプロバイダー */
export function AppThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </ThemeProvider>
  );
}
