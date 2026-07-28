import { useEffect } from 'react';

export default function AnalyticsHooks() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const eventName = href.startsWith('tel:') ? 'phone_click' : href.startsWith('mailto:') ? 'email_click' : '';
      if (!eventName) return;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: eventName,
        link_url: link.href,
        page_path: window.location.pathname,
        original_landing: window.sessionStorage.getItem('td_original_landing') || window.location.href,
        original_referrer: window.sessionStorage.getItem('td_original_referrer') || document.referrer || '',
        landing_city: window.sessionStorage.getItem('td_landing_city') || '',
        landing_region: window.sessionStorage.getItem('td_landing_region') || '',
      });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  return null;
}
