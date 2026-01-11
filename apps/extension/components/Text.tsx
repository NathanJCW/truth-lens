import React from "react"

interface TextProps {
  children?: React.ReactNode
  className?: string
  variant?: "title" | "body" | "button"
  style?: React.CSSProperties
}

export const Text: React.FC<TextProps> = ({ 
  children, 
  className = "", 
  variant = "body",
  style
}) => {
  const baseStyles = "leading-relaxed transition-colors"
  
  const variants = {
    title: "text-[14px] font-bold text-slate-900",
    body: "text-[13px] font-normal text-slate-700",
    button: "text-[13px] font-medium text-white"
  }

  return (
    <span 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={style}
    >
      {children}
    </span>
  )
}
