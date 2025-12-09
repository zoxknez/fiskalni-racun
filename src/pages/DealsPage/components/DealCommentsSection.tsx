/**
 * DealCommentsSection
 *
 * Real-time comments section for deal details
 */

import { formatDistanceToNow } from 'date-fns'
import { enUS, sr } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Reply,
  Send,
  Trash2,
  User,
} from 'lucide-react'
import { memo, useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type DealComment, useDealComments } from '@/hooks/useDealComments'
import { useAppStore } from '@/store/useAppStore'

interface DealCommentsSectionProps {
  dealId: string
  onCommentCountChange?: (count: number) => void
}

interface CommentItemProps {
  comment: DealComment
  onReply: (commentId: string) => void
  onDelete: (commentId: string) => void
  onToggleLike: (commentId: string, isLiked: boolean) => void
  currentUserId: string | undefined
  locale: typeof sr | typeof enUS
  isReply?: boolean
}

const CommentItem = memo(function CommentItem({
  comment,
  onReply,
  onDelete,
  onToggleLike,
  currentUserId,
  locale,
  isReply = false,
}: CommentItemProps) {
  const { t } = useTranslation()
  const [showActions, setShowActions] = useState(false)
  const isOwner = currentUserId === comment.userId

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${isReply ? 'ml-10 border-dark-200 border-l-2 pl-4 dark:border-dark-600' : ''}`}
    >
      <div className="group flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.userAvatar ? (
            <img
              src={comment.userAvatar}
              alt={comment.userName}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-dark-700"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 ring-2 ring-white dark:ring-dark-700">
              <User className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-dark-50 px-4 py-2.5 dark:bg-dark-700">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-semibold text-dark-900 text-sm dark:text-white">
                {comment.userName}
              </span>
              <span className="text-dark-400 text-xs">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale,
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words text-dark-700 text-sm dark:text-dark-200">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-1.5 ml-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => onToggleLike(comment.id, comment.isLikedByUser)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                comment.isLikedByUser
                  ? 'font-medium text-red-500'
                  : 'text-dark-500 hover:text-red-500 dark:text-dark-400'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${comment.isLikedByUser ? 'fill-current' : ''}`} />
              {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
            </button>

            {!isReply && (
              <button
                type="button"
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 text-dark-500 text-xs hover:text-primary-500 dark:text-dark-400"
              >
                <Reply className="h-3.5 w-3.5" />
                {t('deals.reply', 'Odgovori')}
              </button>
            )}

            {isOwner && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowActions(!showActions)}
                  className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-300"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute top-6 left-0 z-10 rounded-lg bg-white py-1 shadow-lg ring-1 ring-dark-200 dark:bg-dark-800 dark:ring-dark-600"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(comment.id)
                          setShowActions(false)
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('common.delete', 'Obriši')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              onToggleLike={onToggleLike}
              currentUserId={currentUserId}
              locale={locale}
              isReply
            />
          ))}
        </div>
      )}
    </motion.div>
  )
})

function DealCommentsSection({ dealId, onCommentCountChange }: DealCommentsSectionProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const locale = i18n.language === 'sr' ? sr : enUS

  const {
    comments,
    isLoading,
    isSubmitting,
    createComment,
    deleteComment,
    toggleLike,
    totalComments,
  } = useDealComments(dealId)

  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  // Update parent when comment count changes
  const handleCommentCreated = useCallback(() => {
    onCommentCountChange?.(totalComments + 1)
  }, [onCommentCountChange, totalComments])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newComment.trim() || !user) return

      const input: { dealId: string; content: string; parentId?: string } = {
        dealId,
        content: newComment.trim(),
      }

      if (replyingTo) {
        input.parentId = replyingTo
      }

      const result = await createComment(input)

      if (result) {
        setNewComment('')
        setReplyingTo(null)
        handleCommentCreated()
      }
    },
    [newComment, user, createComment, dealId, replyingTo, handleCommentCreated]
  )

  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(commentId)
    // Focus input
    inputRef.current?.focus()
  }, [])

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (
        window.confirm(
          t('deals.deleteCommentConfirm', 'Da li ste sigurni da želite da obrišete ovaj komentar?')
        )
      ) {
        await deleteComment(commentId)
        onCommentCountChange?.(totalComments - 1)
      }
    },
    [deleteComment, t, onCommentCountChange, totalComments]
  )

  const replyingToComment = replyingTo
    ? comments.find((c) => c.id === replyingTo) ||
      comments.flatMap((c) => c.replies || []).find((r) => r.id === replyingTo)
    : null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2 border-dark-200 border-b pb-3 dark:border-dark-600">
        <MessageCircle className="h-5 w-5 text-primary-500" />
        <h3 className="font-semibold text-dark-900 dark:text-white">
          {t('deals.comments', 'Komentari')}
        </h3>
        <span className="rounded-full bg-primary-100 px-2 py-0.5 font-medium text-primary-700 text-xs dark:bg-primary-900/30 dark:text-primary-300">
          {totalComments}
        </span>
      </div>

      {/* Comments List */}
      <div className="-mr-2 min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle className="mx-auto mb-2 h-10 w-10 text-dark-300 dark:text-dark-600" />
            <p className="text-dark-500 text-sm dark:text-dark-400">
              {t('deals.noComments', 'Još nema komentara. Budite prvi!')}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onDelete={handleDelete}
                onToggleLike={toggleLike}
                currentUserId={user?.id}
                locale={locale}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Reply indicator */}
      <AnimatePresence>
        {replyingTo && replyingToComment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 dark:bg-primary-900/20"
          >
            <Reply className="h-4 w-4 text-primary-500" />
            <span className="text-primary-700 text-sm dark:text-primary-300">
              {t('deals.replyingTo', 'Odgovarate korisniku')} {replyingToComment.userName}
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="ml-auto text-primary-500 hover:text-primary-700"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Input */}
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 border-dark-200 border-t pt-3 dark:border-dark-600"
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || 'You'}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  replyingTo
                    ? t('deals.writeReply', 'Napišite odgovor...')
                    : t('deals.writeComment', 'Napišite komentar...')
                }
                className="w-full rounded-full bg-dark-100 py-2.5 pr-12 pl-4 text-dark-900 text-sm placeholder:text-dark-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:text-white dark:focus:bg-dark-600 dark:placeholder:text-dark-500"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="-translate-y-1/2 absolute top-1/2 right-2 rounded-full bg-primary-500 p-1.5 text-white transition-all hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mt-4 border-dark-200 border-t pt-3 text-center dark:border-dark-600">
          <p className="text-dark-500 text-sm dark:text-dark-400">
            {t('deals.loginToComment', 'Prijavite se da biste komentarisali')}
          </p>
        </div>
      )}
    </div>
  )
}

export default memo(DealCommentsSection)
