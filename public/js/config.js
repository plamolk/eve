// ค่าที่ต่างกันระหว่างเครื่องนักพัฒนากับเว็บจริง (ใส่ค่าจริงตอน deploy ตาม docs/operations.md)
window.App = window.App || {};

(function () {
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  App.config = {
    // Turnstile test sitekey ใช้ได้เฉพาะในเครื่อง
    turnstileSiteKey: local ? '1x00000000000000000000AA' : 'REPLACE_WITH_SITE_KEY',
    // Google Apps Script web app (ทางสำรองเมื่อ Worker ใช้ไม่ได้)
    sheetsUrl: local ? 'http://localhost:8790/exec' : 'REPLACE_WITH_APPS_SCRIPT_URL'
  };
})();
