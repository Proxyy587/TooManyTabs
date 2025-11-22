import React, { type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";

export type ColorVariant =
  | "red"
  | "green"
  | "blue"
  | "gold"
  | "silver"
  | "bronze"
  | "default";

const colorStyles: Record<ColorVariant, string> = {
  red:    "bg-gradient-to-b from-[#ef5a5a] to-[#b54343] text-white shadow-[0_4px_6px_0_rgba(220,60,60,0.18)] border border-[#b54343]",
  green:  "bg-gradient-to-b from-[#60f8cf] to-[#359579] text-white shadow-[0_4px_8px_0_rgba(50,200,120,0.18)] border border-[#359579]",
  blue:   "bg-gradient-to-b from-[#49b3ff] to-[#246ed9] text-white shadow-[0_4px_8px_0_rgba(80,130,255,0.19)] border border-[#246ed9]",
  gold:   "bg-gradient-to-b from-[#ffe680] to-[#dbb52a] text-white shadow-[0_4px_8px_0_rgba(226,191,45,0.15)] border border-[#dbb52a]",
  silver: "bg-gradient-to-b from-[#dddddd] to-[#888888] text-white shadow-[0_4px_8px_0_rgba(170,170,170,0.16)] border border-[#888888]",
  bronze: "bg-gradient-to-b from-[#ffddb0] to-[#a97c50] text-white shadow-[0_4px_8px_0_rgba(149,110,54,0.14)] border border-[#a97c50]",
  default: "bg-gradient-to-b from-gray-200 to-gray-400 text-gray-900 border border-gray-400 shadow",
};

const hoverActiveStyles: Record<ColorVariant, string> = {
  red:    "hover:brightness-105 active:brightness-95",
  green:  "hover:brightness-105 active:brightness-95",
  blue:   "hover:brightness-105 active:brightness-95",
  gold:   "hover:brightness-105 active:brightness-95",
  silver: "hover:brightness-105 active:brightness-95",
  bronze: "hover:brightness-105 active:brightness-95",
  default: "hover:brightness-105 active:brightness-95",
};

const focusRingStyles: Record<ColorVariant, string> = {
  red:    "focus:ring-2 focus:ring-[#ef5a5a]/40",
  green:  "focus:ring-2 focus:ring-[#60f8cf]/40",
  blue:   "focus:ring-2 focus:ring-[#49b3ff]/40",
  gold:   "focus:ring-2 focus:ring-[#ffe680]/40",
  silver: "focus:ring-2 focus:ring-[#cccccc]/40",
  bronze: "focus:ring-2 focus:ring-[#e5b07e]/40",
  default: "focus:ring-2 focus:ring-gray-400/30",
};

export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Use "red", "green", "blue", "gold", "silver", "bronze", or "default"
   */
  color?: ColorVariant;
  asChild?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles: Record<NonNullable<IButtonProps["size"]>, string> = {
  sm: "px-6 py-1.5 text-md",
  md: "px-7 py-2 text-lg",
  lg: "px-8 py-3 text-xl",
};

export const Button = React.forwardRef<HTMLButtonElement, IButtonProps>(
  (
    {
      children,
      color = "default",
      asChild = false,
      size = "md",
      className = "",
      ...props
    }: IButtonProps,
    forwardedRef
  ) => {
    const Comp = asChild ? Slot : "button";
    // pill and shadow style - matches image
    const base =
      "rounded-full p-[25px] font-semibold transition-all duration-200 focus:outline-none select-none flex items-center justify-center drop-shadow";
    const composedClass = [
      base,
      colorStyles[color],
      sizeStyles[size],
      hoverActiveStyles[color],
      focusRingStyles[color],
      className,
    ];
    return (
      <Comp
        ref={forwardedRef}
        className={composedClass.join(" ")}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

Button.displayName = "Button";