/* Sole Ops analytics — GoatCounter (goatcounter.com): free, open source, cookieless,
   no personal data collected, so no consent banner is needed.

   TO ENABLE: sign up at goatcounter.com (2 min), pick a site code (e.g. "soleops"),
   then set GC_CODE below to that code and commit. Dashboard: https://<code>.goatcounter.com

   Never reads app data: inventory and listings stay in each visitor's own localStorage. */
window.GC_CODE = '';

if (window.GC_CODE) {
  var s = document.createElement('script');
  s.async = true;
  s.dataset.goatcounter = 'https://' + window.GC_CODE + '.goatcounter.com/count';
  s.src = 'https://gc.zgo.at/count.js';
  document.head.appendChild(s);
}

/* Funnel events (no-ops until GC_CODE is set): plan clicks, CTA clicks. */
window.soTrack = function (name) {
  try {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: name, title: name, event: true });
    }
  } catch (e) { /* analytics must never break the app */ }
};
