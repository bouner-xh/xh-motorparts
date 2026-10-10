'use client';

import {useCallback, useEffect, useState} from 'react';
import {AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS, AUDIT_SETUP_MESSAGE, type AuditLogRow} from '@/lib/audit-log';

// 操作紀錄（U10）：哪個管理員帳號、何時、對產品或分類做了什麼。詢價處理紀錄另外放在詢價單裡
const REFRESH_EVENTS = ['audit-tab-opened', 'products-updated', 'categories-updated', 'subcategories-updated', 'vehicle-models-updated'];

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-TW', {timeZone: 'Asia/Taipei', hour12: false});
}

function changeEntries(changes: AuditLogRow['changes']) {
  return Object.entries(changes || {}).map(([field, value]) => {
    const [from, to] = Array.isArray(value) ? value : [null, String(value)];
    return {field, from: from as string | null, to: to as string | null};
  });
}

export function AdminAuditLog() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [actors, setActors] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({days});
      if (actor) query.set('actor', actor);
      if (action) query.set('action', action);
      if (entityType) query.set('entityType', entityType);
      const response = await fetch(`/api/admin/audit-log?${query}`, {cache: 'no-store'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '載入失敗');
      setRows(result.rows || []);
      setActors(result.actors || []);
      setAvailable(result.available !== false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  }, [days, actor, action, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    REFRESH_EVENTS.forEach((name) => window.addEventListener(name, refresh));
    return () => REFRESH_EVENTS.forEach((name) => window.removeEventListener(name, refresh));
  }, [load]);

  return (
    <div className="admin-audit" data-testid="admin-audit-log">
      <h2>操作紀錄</h2>
      <p className="muted">記錄哪個帳號在什麼時間新增、修改、刪除了產品、分類與車型（含改前改後）。詢價單的處理紀錄請到「詢價」分頁查看。</p>

      {!available ? (
        <p className="muted" role="note">
          {AUDIT_SETUP_MESSAGE}
        </p>
      ) : (
        <>
          <div className="admin-customers__toolbar">
            <select aria-label="期間" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">最近 7 天</option>
              <option value="30">最近 30 天</option>
              <option value="90">最近 90 天</option>
              <option value="365">最近一年</option>
            </select>
            <select aria-label="依帳號篩選" value={actor} onChange={(e) => setActor(e.target.value)}>
              <option value="">全部帳號</option>
              {actors.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
            <select aria-label="依動作篩選" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">全部動作</option>
              {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select aria-label="依對象篩選" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">全部對象</option>
              {Object.entries(AUDIT_ENTITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button type="button" className="button-secondary" onClick={() => void load()} disabled={isLoading}>
              重新整理
            </button>
          </div>

          {error ? (
            <p role="alert" className="admin-customers__error">
              {error}
            </p>
          ) : null}

          {isLoading && !rows.length ? (
            <p className="muted">載入中...</p>
          ) : !rows.length ? (
            <p className="muted">這段期間沒有符合條件的操作紀錄。</p>
          ) : (
            <div className="admin-customers__table">
              <table>
                <thead>
                  <tr>
                    <th>時間（台灣時間）</th>
                    <th>帳號</th>
                    <th>動作</th>
                    <th>對象</th>
                    <th>內容</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const entries = changeEntries(row.changes);
                    return (
                      <tr key={row.id} data-testid="audit-row">
                        <td className="small">{formatTime(row.created_at)}</td>
                        <td className="small" data-testid="audit-actor">{row.actor_email}</td>
                        <td>{AUDIT_ACTION_LABELS[row.action] || row.action}</td>
                        <td>
                          <span className="muted small">{AUDIT_ENTITY_LABELS[row.entity_type] || row.entity_type}</span>
                          <br />
                          {row.entity_label || '—'}
                        </td>
                        <td className="small">
                          {entries.length ? (
                            <details>
                              <summary>{entries.length} 項變更</summary>
                              <ul className="admin-audit__changes">
                                {entries.map((entry) => (
                                  <li key={entry.field}>
                                    <strong>{entry.field}</strong>：
                                    {entry.from === null ? (
                                      <span>{entry.to || '（空）'}</span>
                                    ) : entry.to === null ? (
                                      <span>{entry.from || '（空）'}（已刪除）</span>
                                    ) : (
                                      <span>
                                        {entry.from || '（空）'} → {entry.to || '（空）'}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
