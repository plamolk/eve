// Stand-in for Cloudflare Turnstile in tests: always returns the dummy token accepted by the test secret.
window.turnstile = {
  _o: null,
  render: function (el, o) { this._o = o; return 'w1'; },
  execute: function () { const o = this._o; setTimeout(function () { o.callback('XXXX.DUMMY.TOKEN.XXXX'); }, 10); },
  reset: function () {}
};
