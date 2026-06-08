import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/catalog';
import { privacyContent } from '@/lib/privacy-content';

export default async function PrivacyPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  setRequestLocale(localeValue);

  const doc = privacyContent[localeValue];

  return (
    <main>
      <div className="section-heading">
        <div>
          <h2 className="page-title">{doc.title}</h2>
          <p className="muted page-lead">{doc.subtitle}</p>
        </div>
      </div>

      <article className="card privacy-doc-card">
        <p className="privacy-last-updated">{doc.lastUpdated}</p>

        {doc.sections.map((section, idx) => {
          // Section 四 (資料分享與第三方服務) 之後渲染表格
          const isSectionFour = idx === 3;

          return (
            <section key={idx} className="privacy-section">
              <h3 className="privacy-section-title">{section.title}</h3>
              {section.content && (
                <p className="privacy-section-content">{section.content}</p>
              )}

              {section.bullets && (
                <ul className="privacy-bullets">
                  {section.bullets.map((bullet, bIdx) => (
                    <li key={bIdx}>{bullet}</li>
                  ))}
                </ul>
              )}

              {isSectionFour && (
                <div className="privacy-table-wrapper">
                  <table className="privacy-table">
                    <thead>
                      <tr>
                        <th>{doc.tableHeaders.service}</th>
                        <th>{doc.tableHeaders.purpose}</th>
                        <th>{doc.tableHeaders.policy}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.services.map((service, sIdx) => (
                        <tr key={sIdx}>
                          <td><strong>{service.name}</strong></td>
                          <td>{service.purpose}</td>
                          <td>
                            <a
                              href={`https://${service.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {service.url}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {section.subsections &&
                section.subsections.map((sub, sIdx) => (
                  <div key={sIdx} className="privacy-subsection">
                    <h4 className="privacy-subsection-title">{sub.title}</h4>
                    {Array.isArray(sub.body) ? (
                      <ul className="privacy-bullets">
                        {sub.body.map((item, iIdx) => (
                          <li key={iIdx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="privacy-section-content">{sub.body}</p>
                    )}
                  </div>
                ))}
            </section>
          );
        })}
      </article>
    </main>
  );
}

export const revalidate = 3600;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
