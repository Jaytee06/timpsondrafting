(() => {
  const dataLayer = window.dataLayer = window.dataLayer || [];
  const pageContext = {
    landing_city: document.body.dataset.landingCity || '',
    landing_region: document.body.dataset.landingRegion || '',
    page_type: document.body.dataset.pageType || '',
    project_city_prefill: document.body.dataset.projectCityPrefill || '',
    project_state_prefill: document.body.dataset.projectStatePrefill || '',
  };
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
