'use client';

// 從後台回覆客戶（A6 ④）：編輯 → 預覽確認 → 寄出
import {useEffect, useMemo, useRef, useState} from 'react';
import {buildReplyDraft, buildReplyHtml, hasUnfilledPlaceholder, MAX_ATTACHMENT_BYTES, type ReplyInquiry, type ReplyLanguage} from '@/lib/inquiry-reply';
import {browserSessionStorage, clearReplyDraft, isReplyEdited, loadReplyDraft, saveReplyDraft} from '@/lib/inquiry-reply-draft';

const SALES_EMAIL = 'sales@xh-motorparts.com';

export function InquiryReplyComposer({
  inquiry,
  customerEmail,
  onCancel,
  onSent
}: {
  inquiry: ReplyInquiry;
  customerEmail: string;
  onCancel: () => void;
  onSent: (status: string) => void;
}) {
  // 上次沒寄出的草稿（UX-12）：只在第一次顯示時讀取一次，有的話自動還原並提示
  const [restored] = useState(() => {
    const draft = loadReplyDraft(browserSessionStorage(), inquiry.id);
    if (!draft) return null;
    return isReplyEdited(draft, buildReplyDraft(inquiry, draft.language)) ? draft : null;
  });
  const [language, setLanguage] = useState<ReplyLanguage>(restored?.language ?? 'en');
  const initial = useMemo(() => buildReplyDraft(inquiry, restored?.language ?? 'en'), [inquiry, restored]);
  const [subject, setSubject] = useState(restored?.subject ?? initial.subject);
  const [body, setBody] = useState(restored?.body ?? initial.body);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [restoredNotice, setRestoredNotice] = useState(restored);
  const sent = useRef(false);

  const unfilled = hasUnfilledPlaceholder(body);
  const edited = isReplyEdited({subject, body}, buildReplyDraft(inquiry, language));

  // 每次修改都暫存草稿；內容和範本一樣就不留（UX-12）。寄出成功後不能再寫回去
  useEffect(() => {
    if (sent.current) return;
    const storage = browserSessionStorage();
    if (edited || file) saveReplyDraft(storage, inquiry.id, {language, subject, body, hadAttachment: Boolean(file) || Boolean(restoredNotice?.hadAttachment), savedAt: Date.now()});
    else clearReplyDraft(storage, inquiry.id);
  }, [edited, file, language, subject, body, inquiry.id, restoredNotice]);

  function switchLanguage(next: ReplyLanguage) {
    if (next === language) return;
    // 內容已被修改時，換語言會用範本覆蓋，先確認（UX-13）
    if (edited && !window.confirm('切換語言會覆蓋目前內容（主旨與信件內文都會重新套用範本），確定要切換嗎？')) return;
    const draft = buildReplyDraft(inquiry, next);
    setLanguage(next);
    setSubject(draft.subject);
    setBody(draft.body);
    setRestoredNotice(null);
  }

  function discardDraft() {
    const draft = buildReplyDraft(inquiry, 'en');
    clearReplyDraft(browserSessionStorage(), inquiry.id);
    setLanguage('en');
    setSubject(draft.subject);
    setBody(draft.body);
    setFile(null);
    setRestoredNotice(null);
  }

  // 「取消」回到詢價單詳情：有修改過就視為丟棄草稿，先確認
  function cancel() {
    if ((edited || file) && !window.confirm('要捨棄這封尚未寄出的回覆草稿嗎？捨棄後內容無法還原。')) return;
    sent.current = true;
    clearReplyDraft(browserSessionStorage(), inquiry.id);
    onCancel();
  }

  function chooseFile(next: File | null) {
    setError('');
    if (next && next.size > MAX_ATTACHMENT_BYTES) {
      setError('附件不可超過 4 MB，請壓縮 PDF 後再試');
      setFile(null);
      return;
    }
    if (next && !/\.pdf$/i.test(next.name)) {
      setError('附件只接受 PDF 檔');
      setFile(null);
      return;
    }
    setFile(next);
  }

  async function send() {
    setSending(true);
    setError('');
    try {
      const form = new FormData();
      form.append('id', inquiry.id);
      form.append('subject', subject);
      form.append('body', body);
      if (file) form.append('attachment', file);
      const res = await fetch('/api/admin/inquiries/reply', {method: 'POST', body: form});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '寄信失敗');
      // 寄出成功：草稿不再需要
      sent.current = true;
      clearReplyDraft(browserSessionStorage(), inquiry.id);
      onSent(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : '寄信失敗');
      setStep('edit');
    } finally {
      setSending(false);
    }
  }

  if (step === 'preview') {
    return (
      <div className="reply-composer" data-testid="reply-preview">
        <h4>確認寄出內容</h4>
        <dl className="reply-composer__meta">
          <dt>收件人</dt>
          <dd>{customerEmail}</dd>
          <dt>副本</dt>
          <dd>{SALES_EMAIL}（公司留底）</dd>
          <dt>客戶回信寄到</dt>
          <dd>{SALES_EMAIL}</dd>
          <dt>主旨</dt>
          <dd>{subject}</dd>
          <dt>附件</dt>
          <dd>{file ? file.name : '無'}</dd>
        </dl>
        {/* buildReplyHtml 會先跳脫所有內容，只加上換行與段落 */}
        <div className="reply-composer__preview" dangerouslySetInnerHTML={{__html: buildReplyHtml(body)}} />
        {unfilled ? (
          <p role="alert" className="reply-composer__warn">
            內容還有範本的提示文字（【請在這裡填寫…】或 [Please fill in…]），請返回修改後再寄出。
          </p>
        ) : (
          <p className="muted reply-composer__note">信件寄出後無法收回。寄出後這張詢價會改為「已回覆」，內容記錄在處理紀錄。</p>
        )}
        <div className="admin-modal__actions">
          <button type="button" className="button-secondary" onClick={() => setStep('edit')} disabled={sending}>
            返回修改
          </button>
          <button type="button" onClick={() => void send()} disabled={sending || unfilled}>
            {sending ? '寄出中...' : '確認寄出'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reply-composer" data-testid="reply-editor">
      <h4>回覆客戶</h4>
      <p className="muted reply-composer__note">
        收件人：{customerEmail}。寄件人為公司網域信箱，客戶回信會寄到 {SALES_EMAIL}，並副本一份到 {SALES_EMAIL} 留底。
      </p>
      <div className="reply-composer__lang" role="group" aria-label="範本語言">
        <button type="button" aria-pressed={language === 'en'} onClick={() => switchLanguage('en')}>
          English
        </button>
        <button type="button" aria-pressed={language === 'zh-TW'} onClick={() => switchLanguage('zh-TW')}>
          中文
        </button>
        <span className="reply-composer__lang-hint">切換語言會用範本覆蓋目前的主旨與內容；已修改過的內容會先請你確認。</span>
      </div>
      {restoredNotice ? (
        <p className="reply-composer__restored" data-testid="reply-draft-notice" role="status">
          已還原上次沒寄出的草稿{restoredNotice.savedAt ? `（${new Date(restoredNotice.savedAt).toLocaleString('zh-TW', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}）` : ''}。
          {restoredNotice.hadAttachment ? '附件無法保留，需要的話請重新選擇。' : ''}
          <button type="button" className="admin-stat__link" onClick={discardDraft}>
            捨棄草稿
          </button>
        </p>
      ) : null}
      <label>
        主旨
        <input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label>
        內容
        <textarea value={body} rows={14} maxLength={10000} onChange={(e) => setBody(e.target.value)} />
      </label>
      <label>
        附件（選填，PDF，最大 4 MB）
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => chooseFile(e.target.files?.[0] || null)} />
      </label>
      {error ? (
        <p role="alert" className="reply-composer__warn">
          {error}
        </p>
      ) : null}
      <div className="admin-modal__actions">
        <button type="button" className="button-secondary" onClick={cancel}>
          取消
        </button>
        <button type="button" onClick={() => setStep('preview')} disabled={!subject.trim() || !body.trim()}>
          預覽
        </button>
      </div>
    </div>
  );
}
