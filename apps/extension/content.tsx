import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import React, { useEffect, useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, Loader2 } from "lucide-react"
import { Icon } from "./components/Icon"
import styleText from "data-text:./style.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

export const getMountPoint = async () => document.body

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

type UIState = "IDLE" | "BUBBLE" | "ACTION_BAR" | "LOADING" | "PANEL"

const TruthLensUI = () => {
  const [state, setState] = useState<UIState>("IDLE")
  const [selectedText, setSelectedText] = useState("")
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [result, setResult] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const calculatePosition = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    
    const range = selection.getRangeAt(0)
    const rects = range.getClientRects()
    if (rects.length === 0) return null

    const lastRect = rects[rects.length - 1]
    
    return {
      x: lastRect.right + window.scrollX + 2,
      y: lastRect.bottom + window.scrollY + 2
    }
  }, [])

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return

      setTimeout(() => {
        const selection = window.getSelection()
        const text = selection?.toString().trim()
        
        if (text && text.length >= 10) {
          const pos = calculatePosition()
          if (pos) {
            setSelectedText(text)
            setPosition(pos)
            setState("BUBBLE")
          }
        }
      }, 50)
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (state !== "LOADING" && state !== "PANEL") {
          setState("IDLE")
          window.getSelection()?.removeAllRanges()
        }
      }
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [state, calculatePosition])

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setState("LOADING")
    setResult("")
    window.getSelection()?.removeAllRanges()

    try {
      const response = await fetch("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText })
      })
      
      if (!response.ok) throw new Error("API Connection Failed")

      setState("PANEL")
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          setResult(prev => prev + decoder.decode(value, { stream: true }))
        }
      }
    } catch (error) {
      console.warn("[TruthLens] API Error, falling back to mock mode:", error)
      setState("PANEL")
      const mockText = "总结：待验证\n\n核心分析：根据深度分析，这段文本包含事实性描述，但部分数据可能需要进一步核实。\n\n支持点：文本描述与公开报道基本相符。\n\n矛盾点：暂无明确冲突证据。\n\n结论：建议查阅官方公告以获取最新准确信息。\n\n(注：检测到后端服务未启动，当前显示为演示数据)"
      let i = 0
      const interval = setInterval(() => {
        setResult(mockText.slice(0, i))
        i += 4
        if (i > mockText.length) clearInterval(interval)
      }, 30)
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setState("IDLE")
    window.getSelection()?.removeAllRanges()
  }

  return (
    <div 
      ref={containerRef} 
      className="truth-lens-root"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2147483647
      }}
    >
      <AnimatePresence>
        {state !== "IDLE" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: "absolute",
              left: position.x,
              top: position.y,
              pointerEvents: "auto",
              transformOrigin: "top left"
            }}
          >
            {/* 1. Bubble / Action Bar / Loading Stage (Exclusive to PANEL) */}
            {(state === "BUBBLE" || state === "ACTION_BAR" || state === "LOADING") && (
              <motion.div
                layout
                onMouseEnter={() => state === "BUBBLE" && setState("ACTION_BAR")}
                onMouseLeave={() => state === "ACTION_BAR" && setState("BUBBLE")}
                className={`white-card overflow-hidden flex items-center shadow-lg ${
                  state === "BUBBLE" ? "bubble-circle" : "bar-capsule"
                }`}
              >
                <div className="flex items-center w-full justify-between gap-2 h-full">
                  {state === "BUBBLE" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center w-full h-full">
                      <Icon style={{ width: 16, height: 16 }} className="text-indigo-600" />
                    </motion.div>
                  )}

                  {state === "ACTION_BAR" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between w-full">
                      <button
                        onClick={handleAnalyze}
                        className="flex items-center gap-1.5 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
                        style={{ border: "none", background: "none", cursor: "pointer" }}
                      >
                        <Search size={14} className="text-slate-800 flex-shrink-0" />
                        <span className="text-[12px] font-medium text-slate-800">辨真伪</span>
                      </button>
                      <div className="w-[1px] h-3 bg-slate-200 mx-1" />
                      <button onClick={handleClose} className="p-1 hover:bg-slate-50 rounded-full text-slate-400" style={{ border: "none", background: "none", cursor: "pointer" }}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}

                  {state === "LOADING" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-3">
                      <Loader2 size={14} className="animate-spin text-indigo-600" />
                      <span className="text-[12px] text-slate-600">分析中...</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. Analysis Panel Stage (V5.0 Fixed Layout) */}
            {state === "PANEL" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="white-card truth-lens-panel flex flex-col overflow-hidden"
              >
                {/* Header: Fixed 48px */}
                <div className="h-[48px] px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full primary-gradient animate-pulse" />
                    <span className="text-[14px] font-bold text-slate-800 tracking-tight">Truth Lens 分析结论</span>
                  </div>
                  <button onClick={handleClose} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 transition-colors" style={{ border: "none", background: "none", cursor: "pointer" }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Content: High Readability */}
                <div className="p-5 overflow-y-auto custom-scrollbar text-[14px] text-slate-700 leading-[1.8] whitespace-pre-wrap">
                  {result ? (
                    result.split('\n').map((line, idx) => {
                      const cleanLine = line.replace(/[\*\-#]/g, '').trim();
                      if (!cleanLine) return <div key={idx} className="h-4" />;
                      
                      if (cleanLine.startsWith('总结：')) {
                        return (
                          <div key={idx} className="text-[16px] font-bold text-slate-900 mb-3">
                            {cleanLine}
                          </div>
                        );
                      }
                      return <div key={idx} className="mb-2">{cleanLine}</div>;
                    })
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span>正在解析深度证据链...</span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="inline-block w-[2px] h-4 bg-indigo-600 align-middle" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TruthLensUI
