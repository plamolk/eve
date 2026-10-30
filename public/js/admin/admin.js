// หน้าสรุปผล (ช่วงเปลี่ยนผ่าน: ยังแสดงข้อมูลจำลอง จะเปลี่ยนเป็นข้อมูลจริงจาก API)
window.App = window.App || {};

(function () {
  const root = document.getElementById('app');
  root.innerHTML = App.pages.summary.render();
  root.addEventListener('click', function (ev) {
    const el = ev.target.closest('[data-action="home"]');
    if (el) location.href = 'index.html';
  });
})();
