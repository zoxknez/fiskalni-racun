/**
 * ImageLightbox Component
 *
 * Full-screen lightbox for viewing document images with zoom controls
 */

import { motion } from 'framer-motion'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageLightboxProps {
  url: string
  zoom: number
  onZoomChange: (zoom: number) => void
  onClose: () => void
}

export function ImageLightbox({ url, zoom, onZoomChange, onClose }: ImageLightboxProps) {
  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    onZoomChange(Math.min(3, zoom + 0.25))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    onZoomChange(Math.max(0.5, zoom - 0.25))
  }

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onZoomChange(zoom >= 2 ? 1 : zoom + 0.5)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </motion.button>

      {/* Zoom controls */}
      <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-10 flex gap-2 rounded-full bg-white/10 p-2 backdrop-blur-sm">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomOut}
          className="rounded-full p-2 text-white hover:bg-white/20"
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="h-5 w-5" />
        </motion.button>
        <span className="flex items-center px-3 text-sm text-white">{Math.round(zoom * 100)}%</span>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomIn}
          className="rounded-full p-2 text-white hover:bg-white/20"
          disabled={zoom >= 3}
        >
          <ZoomIn className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Image */}
      <motion.img
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: zoom, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        src={url}
        alt="Document preview"
        className="max-h-[85vh] max-w-[90vw] cursor-zoom-in rounded-lg object-contain shadow-2xl"
        onClick={handleImageClick}
        style={{ transform: `scale(${zoom})` }}
        draggable={false}
      />
    </motion.div>
  )
}
