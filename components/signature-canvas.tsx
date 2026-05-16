"use client"

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Eraser, Undo2 } from "lucide-react"

export interface SignatureCanvasHandle {
  /** 현재 캔버스가 비어있는지 (한 획도 그리지 않음) */
  isEmpty: () => boolean
  /** 캔버스를 PNG dataURL 로 추출 (투명 배경) */
  toDataURL: () => string | null
  /** 모두 지우기 */
  clear: () => void
}

interface SignatureCanvasProps {
  width?: number
  height?: number
  strokeColor?: string
  strokeWidth?: number
  onChange?: (hasDrawing: boolean) => void
}

interface Point {
  x: number
  y: number
}

/**
 * 마우스/터치로 손글씨 서명 입력. 그린 결과를 PNG 로 추출.
 * Pointer events 사용 → 마우스 + 터치 + 펜 모두 통합 처리.
 *
 * 투명 배경 + 검은색 라인이 기본. 계약서에 합성될 때 흰 박스 없이 깔끔하게 들어감.
 */
export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  function SignatureCanvas(
    { width = 600, height = 220, strokeColor = "#111111", strokeWidth = 2.5, onChange },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
    const isDrawingRef = useRef(false)
    const lastPointRef = useRef<Point | null>(null)
    const strokesRef = useRef<Array<Array<Point>>>([]) // 획 기록 (undo 용)
    const currentStrokeRef = useRef<Array<Point>>([])
    const [hasDrawing, setHasDrawing] = useState(false)

    // 캔버스 초기 셋업 — devicePixelRatio 반영해서 선명하게
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctxRef.current = ctx
    }, [width, height, strokeColor, strokeWidth])

    const redrawAll = () => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      for (const stroke of strokesRef.current) {
        if (stroke.length === 0) continue
        ctx.beginPath()
        ctx.moveTo(stroke[0].x, stroke[0].y)
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y)
        }
        ctx.stroke()
      }
    }

    useImperativeHandle(ref, () => ({
      isEmpty: () => strokesRef.current.length === 0,
      toDataURL: () => {
        const canvas = canvasRef.current
        if (!canvas) return null
        if (strokesRef.current.length === 0) return null
        return canvas.toDataURL("image/png")
      },
      clear: () => {
        strokesRef.current = []
        redrawAll()
        setHasDrawing(false)
        onChange?.(false)
      },
    }))

    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      canvas.setPointerCapture(e.pointerId)
      isDrawingRef.current = true
      const p = getPoint(e)
      lastPointRef.current = p
      currentStrokeRef.current = [p]
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      const ctx = ctxRef.current
      const last = lastPointRef.current
      if (!ctx || !last) return
      const p = getPoint(e)
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      currentStrokeRef.current.push(p)
      lastPointRef.current = p
    }

    /**
     * 한 획 끝날 때마다 onChange 호출 — 외부에서 toDataURL 가져가서
     * 실시간 미리보기 갱신할 수 있도록.
     */
    const notifyChange = () => {
      const empty = strokesRef.current.length === 0
      setHasDrawing(!empty)
      onChange?.(!empty)
    }

    const handlePointerUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      if (currentStrokeRef.current.length > 1) {
        strokesRef.current.push(currentStrokeRef.current)
        notifyChange()
      }
      currentStrokeRef.current = []
      lastPointRef.current = null
    }

    const handleUndo = () => {
      if (strokesRef.current.length === 0) return
      strokesRef.current.pop()
      redrawAll()
      notifyChange()
    }

    const handleClear = () => {
      strokesRef.current = []
      redrawAll()
      notifyChange()
    }

    return (
      <div className="space-y-2">
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white p-1 inline-block">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: "none", display: "block", cursor: "crosshair" }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>마우스나 손가락으로 위 영역에 서명해주세요.</span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={!hasDrawing}
              className="h-7 text-xs"
            >
              <Undo2 className="h-3 w-3 mr-1" />
              되돌리기
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!hasDrawing}
              className="h-7 text-xs"
            >
              <Eraser className="h-3 w-3 mr-1" />
              지우기
            </Button>
          </div>
        </div>
      </div>
    )
  }
)
