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
      window.dataLayer.push({ event: eventName, link_url: link.href });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  return null;
}
