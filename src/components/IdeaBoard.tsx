import { useState, useRef, useCallback, useEffect } from 'react'
import type { Board, BoardSticker, BoardConnection } from '../types'

const STICKER_COLORS = ['#7C3AED', '#F97316', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#EC4899']
const STICKER_W = 140
const STICKER_H = 80

interface Props {
  board: Board
  onChange: (board: Board) => void
}

export function IdeaBoard({ board, onChange }: Props) {
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null)

  const addSticker = useCallback(() => {
    const container = containerRef.current
    const offsetX = container ? container.scrollLeft + 40 : 40
    const offsetY = container ? container.scrollTop + 40 : 40
    const color = STICKER_COLORS[board.stickers.length % STICKER_COLORS.length]
    const sticker: BoardSticker = {
      id: `s-${Date.now()}`,
      text: 'Новая идея',
      x: offsetX + Math.random() * 100,
      y: offsetY + Math.random() * 60,
      color,
    }
    onChange({ ...board, stickers: [...board.stickers, sticker] })
    setEditingId(sticker.id)
    setEditText(sticker.text)
  }, [board, onChange])

  const updateSticker = useCallback((id: string, patch: Partial<BoardSticker>) => {
    onChange({
      ...board,
      stickers: board.stickers.map(s => s.id === id ? { ...s, ...patch } : s),
    })
  }, [board, onChange])

  const deleteSticker = useCallback((id: string) => {
    onChange({
      stickers: board.stickers.filter(s => s.id !== id),
      connections: board.connections.filter(c => c.from !== id && c.to !== id),
    })
    setEditingId(null)
  }, [board, onChange])

  const handleStickerPointerDown = useCallback((e: React.PointerEvent, sticker: BoardSticker) => {
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(sticker.id)
      } else if (connectFrom !== sticker.id) {
        const exists = board.connections.some(
          c => (c.from === connectFrom && c.to === sticker.id) || (c.from === sticker.id && c.to === connectFrom),
        )
        if (!exists) {
          onChange({ ...board, connections: [...board.connections, { from: connectFrom, to: sticker.id }] })
        }
        setConnectFrom(null)
        setConnectMode(false)
      }
      return
    }

    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    dragRef.current = {
      id: sticker.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: sticker.x,
      oy: sticker.y,
    }
    el.setPointerCapture(e.pointerId)
  }, [connectMode, connectFrom, board, onChange])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    updateSticker(dragRef.current.id, {
      x: Math.max(0, dragRef.current.ox + dx),
      y: Math.max(0, dragRef.current.oy + dy),
    })
  }, [updateSticker])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const handleStickerDoubleClick = (sticker: BoardSticker) => {
    setEditingId(sticker.id)
    setEditText(sticker.text)
  }

  const handleEditBlur = () => {
    if (editingId) {
      updateSticker(editingId, { text: editText || 'Идея' })
      setEditingId(null)
    }
  }

  // Get sticker center for connections
  function stickerCenter(id: string) {
    const s = board.stickers.find(s => s.id === id)
    if (!s) return null
    return { x: s.x + STICKER_W / 2, y: s.y + STICKER_H / 2 }
  }

  const canvasW = Math.max(600, ...board.stickers.map(s => s.x + STICKER_W + 40))
  const canvasH = Math.max(400, ...board.stickers.map(s => s.y + STICKER_H + 40))

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={addSticker}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}
        >
          + Стикер
        </button>
        <button
          onClick={() => { setConnectMode(m => !m); setConnectFrom(null) }}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={{
            backgroundColor: connectMode ? '#7C3AED' : '#7C3AED22',
            color: connectMode ? '#fff' : '#7C3AED',
          }}
        >
          {connectMode ? (connectFrom ? 'Выбери второй...' : 'Выбери первый...') : '↔ Связь'}
        </button>
        {connectMode && (
          <button
            onClick={() => { setConnectMode(false); setConnectFrom(null) }}
            className="px-2 py-1.5 rounded-xl text-xs"
            style={{ color: '#EF4444' }}
          >
            Отмена
          </button>
        )}
        <span className="ml-auto text-xs" style={{ color: '#9B98B8' }}>
          {board.stickers.length} стикеров
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ backgroundColor: '#1A1728', cursor: connectMode ? 'crosshair' : 'default' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="relative" style={{ width: canvasW, height: canvasH }}>
          {/* SVG for connections */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: canvasW, height: canvasH }}
          >
            {board.connections.map((c, i) => {
              const from = stickerCenter(c.from)
              const to = stickerCenter(c.to)
              if (!from || !to) return null
              return (
                <line
                  key={i}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke="rgba(124,58,237,0.5)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
              )
            })}
          </svg>

          {/* Stickers */}
          {board.stickers.map(sticker => (
            <div
              key={sticker.id}
              className="absolute rounded-xl select-none"
              style={{
                left: sticker.x,
                top: sticker.y,
                width: STICKER_W,
                height: STICKER_H,
                backgroundColor: `${sticker.color}22`,
                border: `1.5px solid ${sticker.color}${connectFrom === sticker.id ? 'FF' : '55'}`,
                boxShadow: connectFrom === sticker.id ? `0 0 0 3px ${sticker.color}66` : undefined,
                cursor: connectMode ? 'pointer' : 'grab',
                touchAction: 'none',
                zIndex: editingId === sticker.id ? 10 : 1,
              }}
              onPointerDown={e => handleStickerPointerDown(e, sticker)}
              onDoubleClick={() => handleStickerDoubleClick(sticker)}
            >
              {/* Color dot + delete */}
              <div className="flex items-center justify-between px-2 pt-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sticker.color }}
                />
                <button
                  className="text-xs opacity-40 hover:opacity-100 transition-opacity"
                  style={{ color: '#EF4444', lineHeight: 1 }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => deleteSticker(sticker.id)}
                >
                  ×
                </button>
              </div>

              {/* Text */}
              <div className="px-2 pb-2">
                {editingId === sticker.id ? (
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onBlur={handleEditBlur}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditBlur() } }}
                    className="w-full resize-none text-xs bg-transparent outline-none"
                    style={{ color: '#F0EEFF', height: 44 }}
                    onPointerDown={e => e.stopPropagation()}
                  />
                ) : (
                  <p
                    className="text-xs leading-tight"
                    style={{ color: '#F0EEFF', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                  >
                    {sticker.text}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {board.stickers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <p className="text-3xl">💡</p>
              <p className="text-sm" style={{ color: '#9B98B8' }}>Нажми «+ Стикер» чтобы добавить идею</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
