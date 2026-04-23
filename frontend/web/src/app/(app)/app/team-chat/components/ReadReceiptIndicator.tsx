'use client';

import { Check, CheckCheck } from 'lucide-react';
import type { ReadReceipt } from '@/types/team-chat.types';

interface ReadReceiptIndicatorProps {
  receipts: ReadReceipt[];
  isOwn: boolean;
}

/**
 * Shows ✓ (sent) or ✓✓ (read) for own messages only
 */
export function ReadReceiptIndicator({ receipts, isOwn }: ReadReceiptIndicatorProps) {
  if (!isOwn) return null;

  const isRead = receipts.length > 0;

  return (
    <span
      className={isRead ? 'text-blue-500' : 'text-gray-400'}
      title={isRead ? 'Read' : 'Sent'}
    >
      {isRead ? <CheckCheck size={14} /> : <Check size={14} />}
    </span>
  );
}
