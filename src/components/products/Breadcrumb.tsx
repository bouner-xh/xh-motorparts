import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="breadcrumb-wrap">
      <ol className="breadcrumb" itemScope itemType="https://schema.org/BreadcrumbList">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} itemScope itemType="https://schema.org/ListItem" itemProp="itemListElement">
            {item.href ? (
              <Link href={item.href} itemProp="item">
                <span itemProp="name">{item.label}</span>
              </Link>
            ) : (
              <span itemProp="name">{item.label}</span>
            )}
            <meta itemProp="position" content={String(index + 1)} />
            {index < items.length - 1 ? <span className="breadcrumb-sep">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
