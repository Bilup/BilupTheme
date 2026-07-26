(function () {
  console.log('Auth script loaded, URL:', window.location.href);

  const auth_token = getCookie("auth_token");
  if (auth_token != "") {
    console.log('Found existing auth_token, redirecting');
    const next = new URLSearchParams(window.location.search).get('next');
    window.location.href = next || "/";
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  console.log('Token from URL:', token ? 'found' : 'not found');

  const roturBtn = document.getElementById('rotur-btn');
  if (roturBtn) {
    const next = urlParams.get('next');
    const returnTo = window.location.origin + window.location.pathname + (next ? `?next=${encodeURIComponent(next)}` : '');
    roturBtn.href = "https://rotur.dev/auth?return_to=".concat(encodeURIComponent(returnTo));
    console.log('Updated rotur-btn href:', roturBtn.href);
  }

  if (token) {
    console.log('Processing token...');
    (async () => {
      try {
        const apiUrl = `${window.location.origin}/api/auth/login`;
        console.log('Fetching:', apiUrl);
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        console.log('Response status:', resp.status);
        const json = await resp.json();
        console.log('Response JSON:', json);
        if (json.ok) {
          const next = urlParams.get('next');
          console.log('Login successful, redirecting to:', next || "/");
          window.location.href = next || "/";
        } else {
          console.error('Login failed:', json.error);
          document.body.innerHTML = '<div class="empty-state"><i data-lucide="alert-circle"></i><h2>Login Failed</h2><p>' + (json.error || 'Unknown error') + '</p><a href="/auth" class="btn primary">Try Again</a></div>';
          lucide.createIcons();
        }
      } catch (err) {
        console.error('Fetch error:', err);
        document.body.innerHTML = '<div class="empty-state"><i data-lucide="alert-circle"></i><h2>Network Error</h2><p>' + err.message + '</p><a href="/auth" class="btn primary">Try Again</a></div>';
        lucide.createIcons();
      }
    })();
  }
})();

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
