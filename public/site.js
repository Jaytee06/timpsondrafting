(() => {
  const dataLayer = window.dataLayer = window.dataLayer || [];
  const pageContext = {
    landing_city: document.body.dataset.landingCity || '',
    landing_region: document.body.dataset.landingRegion || '',
    page_type: document.body.dataset.pageType || '',
    project_city_prefill: document.body.dataset.projectCityPrefill || '',
    project_state_prefill: document.body.dataset.projectStatePrefill || '',
  };
  if (!sessionStorage.getItem('td_original_landing')) sessionStorage.setItem('td_original_landing', location.href);
  if (!sessionStorage.getItem('td_original_referrer')) sessionStorage.setItem('td_original_referrer', document.referrer || '');
  if (pageContext.landing_city && !sessionStorage.getItem('td_landing_city')) sessionStorage.setItem('td_landing_city', pageContext.landing_city);
  if (pageContext.landing_region && !sessionStorage.getItem('td_landing_region')) sessionStorage.setItem('td_landing_region', pageContext.landing_region);
  const query = new URLSearchParams(location.search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = query.get(key);
    if (value && !sessionStorage.getItem(`td_first_touch_${key}`)) sessionStorage.setItem(`td_first_touch_${key}`, value);
  }
  const track = (event, details = {}) => dataLayer.push({ event, ...pageContext, ...details });
  document.querySelector('.nav-toggle')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.getElementById('site-nav')?.classList.toggle('open', open);
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    if (link.matches('[href^="tel:"]')) track('phone_click', { link_url: link.href });
    if (link.matches('[href^="mailto:"]')) track('email_click', { link_url: link.href });
    if (link.dataset.track) track(link.dataset.track, { link_url: link.href });
  });
  if (document.body.dataset.pageType) track('city_page_view');
})();
