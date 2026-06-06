'use client';

import {useState} from 'react';
import {Turnstile} from '@marsidev/react-turnstile';
import {useTranslations} from 'next-intl';

export function InquiryForm({productModel, productName}: {productModel: string; productName: string}) {
  const t = useTranslations('inquiry');
  const [status, setStatus] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function onSubmit(formData: FormData) {
    setStatus(t('sending'));

    const payload = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      message: String(formData.get('message') || ''),
      productModel,
      productName,
      turnstileToken: token
    };

    const response = await fetch('/api/inquiry', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setStatus(response.ok ? t('success') : result.error || t('error'));
  }

  return (
    <form className="card inquiry-form" action={onSubmit}>
      <h3>{t('title')}</h3>
      <label>
        {t('name')}
        <input name="name" type="text" required />
      </label>
      <label>
        {t('email')}
        <input name="email" type="email" required />
      </label>
      <label>
        {t('message')}
        <textarea name="message" rows={4} defaultValue={`${productModel} / ${productName}`} />
      </label>
      {siteKey ? (
        <Turnstile siteKey={siteKey} onSuccess={(value) => setToken(value)} />
      ) : (
        <p className="muted">{t('captchaPending')}</p>
      )}
      <button type="submit">{t('submit')}</button>
      {status ? <p className="muted">{status}</p> : null}
    </form>
  );
}
