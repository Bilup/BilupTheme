$(function () {
  const auth_token = getCookie("auth_token");
  if (auth_token != "") {
    const next = new URLSearchParams(window.location.search).get('next');
    window.location.href = next || "/";
    return;
  }

  const roturBtn = document.getElementById('rotur-btn');
  if (roturBtn) {
    const returnTo = window.location.href;
    roturBtn.href = "https://rotur.dev/auth?return_to=".concat(encodeURIComponent(returnTo));
  }

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    (async () => {
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const json = await resp.json();
        if (json.ok) {
          const next = urlParams.get('next');
          window.location.href = next || "/";
        } else {
          document.body.innerHTML = '<div class="empty-state"><i data-lucide="alert-circle"></i><h2>Login Failed</h2><p>' + (json.error || 'Unknown error') + '</p><a href="/auth" class="btn primary">Try Again</a></div>';
          lucide.createIcons();
        }
      } catch (err) {
        document.body.innerHTML = '<div class="empty-state"><i data-lucide="alert-circle"></i><h2>Network Error</h2><p>Could not reach the server.</p><a href="/auth" class="btn primary">Try Again</a></div>';
        lucide.createIcons();
      }
    })();
  }
});

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// jquery 检查（如果页面没有 jQuery，就自己提供 document.ready 功能）
if (typeof jQuery === 'undefined') {
  var $ = function (fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };
}
