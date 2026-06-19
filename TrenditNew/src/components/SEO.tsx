import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product';
}

export const SEO: React.FC<SEOProps> = ({ 
  title = 'Trendit OS | Lebanon\'s AI-Powered Multi-Vendor Marketplace', 
  description = 'Shop the best Lebanese vendors on Trendit OS. AI-powered logistics, fast delivery, and verified sellers across Lebanon.', 
  image = 'https://trendit-os.com/og-image.jpg', 
  url = 'https://trendit-os.com',
  type = 'website'
}) => {
  const siteName = 'Trendit OS';
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
      
      {/* Theme Color */}
      <meta name="theme-color" content="#2563eb" />
    </Helmet>
  );
};
