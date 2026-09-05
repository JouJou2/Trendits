import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product';
  /** schema.org JSON-LD for this page (e.g. Product on a product page). */
  jsonLd?: Record<string, unknown>;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'Lebanon\'s Premium Marketplace',
  description = 'Shop the best Lebanese vendors on Trendit. Fast delivery and verified sellers across Lebanon.',
  image = 'https://trenditlb.com/og-image.jpg',
  url = 'https://trenditlb.com',
  type = 'website',
  jsonLd,
}) => {
  const siteName = 'Trendit';
  // `title` must never already include the site name, or it gets appended twice.
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Lebanon Specific Tags */}
      <meta name="geo.region" content="LB" />
      <meta name="geo.placename" content="Beirut" />
      
      {/* Page-specific structured data. Rendered through Helmet so each product
          page emits its own Product schema; Googlebot executes JS and picks it up. */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}

      {/* Theme Color */}
      <meta name="theme-color" content="#2563eb" />
    </Helmet>
  );
};
