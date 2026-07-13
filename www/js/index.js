// ==========================================
// M-Browser - Home Page Logic
// File: www/js/index.js
// ==========================================

document.addEventListener('deviceready', onReady, false);
document.addEventListener('DOMContentLoaded', onReady, false);

var didInit = false;

function onReady() {
  if (didInit) return;
  didInit = true;
  try {
    startClock();
    loadWeather();
    bindQuickAccess();
    bindWhatsApp();
    bindRefreshButtons();
    bindAddressBar();
    bindTopBar();
  } catch (err) {
    console.error('Init error:', err);
  }
}

/* ==========================================
   1. LIVE CLOCK
   ========================================== */
function startClock() {
  tickClock();
  setInterval(tickClock, 1000);
}

function tickClock() {
  var now = new Date();
  var h = now.getHours();
  var m = now.getMinutes();
  var s = now.getSeconds();
  var ampm = h >= 12 ? 'PM' : 'AM';

  h = h % 12;
  h = h ? h : 12;
  m = m < 10 ? '0' + m : m;
  s = s < 10 ? '0' + s : s;

  setText('time-main', h + ':' + m);
  setText('time-sec', ':' + s);
  setText('time-ampm', ampm);
  setText('date-text', now.toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }));
}

/* ==========================================
   2. WEATHER (Open-Meteo — free, no API key)
   ========================================== */
var DEFAULT_LAT = 24.8607;
var DEFAULT_LON = 67.0011;
var DEFAULT_CITY = 'Karachi';

function loadWeather() {
  if (navigator.geolocation) {
    var settled = false;
    var timer = setTimeout(function () {
      if (!settled) {
        settled = true;
        fetchWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
      }
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fetchWeather(pos.coords.latitude, pos.coords.longitude, null);
      },
      function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fetchWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
      },
      { timeout: 5000 }
    );
  } else {
    fetchWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
  }
}

function fetchWeather(lat, lon, cityNameOverride) {
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
    '&longitude=' + lon +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code';

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var cur = data.current;
      setText('weather-temp', Math.round(cur.temperature_2m));
      setText('weather-humidity', Math.round(cur.relative_humidity_2m));
      setText('weather-wind', Math.round(cur.wind_speed_10m));

      var desc = weatherCodeToText(cur.weather_code);
      setText('weather-desc', desc.text);
      setText('weather-icon', desc.icon);

      if (cityNameOverride) {
        setText('weather-city', cityNameOverride);
      } else {
        reverseGeocode(lat, lon);
      }
    })
    .catch(function (err) {
      console.error('Weather fetch failed:', err);
      setText('weather-desc', 'Weather unavailable');
      setText('weather-temp', '--');
      setText('weather-city', cityNameOverride || DEFAULT_CITY);
    });
}

function reverseGeocode(lat, lon) {
  var url = 'https://geocoding-api.open-meteo.com/v1/reverse?latitude=' + lat + '&longitude=' + lon;
  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var name = (data.results && data.results[0] && data.results[0].name) || DEFAULT_CITY;
      setText('weather-city', name);
    })
    .catch(function () {
      setText('weather-city', DEFAULT_CITY);
    });
}

function weatherCodeToText(code) {
  var map = {
    0: { text: 'Clear Sky', icon: '☀️' },
    1: { text: 'Mainly Clear', icon: '🌤️' },
    2: { text: 'Partly Cloudy', icon: '⛅' },
    3: { text: 'Overcast', icon: '☁️' },
    45: { text: 'Fog', icon: '🌫️' },
    48: { text: 'Fog', icon: '🌫️' },
    51: { text: 'Light Drizzle', icon: '🌦️' },
    61: { text: 'Light Rain', icon: '🌧️' },
    63: { text: 'Rain', icon: '🌧️' },
    65: { text: 'Heavy Rain', icon: '🌧️' },
    71: { text: 'Snow', icon: '❄️' },
    80: { text: 'Rain Showers', icon: '🌦️' },
    95: { text: 'Thunderstorm', icon: '⛈️' }
  };
  return map[code] || { text: 'Clear Sky', icon: '☀️' };
}

/* ==========================================
   3. QUICK ACCESS BUTTONS
   ========================================== */
var quickLinks = {
  'btn-quiz': 'https://aaghi.aiou.edu.pk',
  'btn-aiou': 'https://aiou.edu.pk',
  'btn-gmail': 'https://mail.google.com',
  'btn-google': 'https://www.google.com',
  'btn-youtube': 'https://www.youtube.com'
};

function bindQuickAccess() {
  Object.keys(quickLinks).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () {
      if (id === 'btn-quiz') {
        openQuizLink(quickLinks[id]);
      } else {
        openLink(quickLinks[id]);
      }
    });
  });
}

/* ==========================================
   3B. QUIZ PAGE ONLY — Copy button
   Uses a <div> (not <button>) + !important CSS
   so the site's own stylesheet cannot override it.
   ========================================== */
function openQuizLink(url) {
  if (window.cordova && window.cordova.InAppBrowser) {
    var ref = cordova.InAppBrowser.open(url, '_blank', 'location=yes,toolbar=yes,zoom=yes');

    var inject = function () {
      var injectedJS =
        "(function(){" +
        "function makeBtn(){" +
        "if(document.getElementById('mbrowser-copy-btn'))return;" +
        "if(!document.getElementById('mbrowser-copy-style')){" +
        "var st=document.createElement('style');" +
        "st.id='mbrowser-copy-style';" +
        "st.innerHTML='#mbrowser-copy-btn{all:initial !important;position:fixed !important;bottom:22px !important;right:20px !important;z-index:2147483647 !important;display:flex !important;align-items:center !important;gap:8px !important;background:linear-gradient(160deg,#2f7bf5,#1257c9) !important;color:#fff !important;border:none !important;border-radius:999px !important;padding:13px 20px !important;font-size:15px !important;font-weight:700 !important;font-family:-apple-system,Roboto,Arial,sans-serif !important;box-shadow:0 8px 20px rgba(11,61,145,0.35) !important;cursor:pointer !important;width:auto !important;height:auto !important;line-height:normal !important;} #mbrowser-copy-btn *{all:unset !important;font-family:inherit !important;font-size:inherit !important;color:inherit !important;font-weight:inherit !important;}';" +
        "document.head.appendChild(st);" +
        "}" +
        "var btn=document.createElement('div');" +
        "btn.id='mbrowser-copy-btn';" +
        "var icon=document.createElement('span');" +
        "icon.textContent='\\uD83D\\uDCCB';" +
        "icon.style.fontSize='17px';" +
        "var label=document.createElement('span');" +
        "label.textContent='Copy Quiz';" +
        "btn.appendChild(icon);" +
        "btn.appendChild(label);" +
        "document.body.appendChild(btn);" +
        "btn.addEventListener('click',function(e){" +
        "e.stopPropagation();" +
        "var text=window.getSelection().toString();" +
        "if(!text){text=document.body.innerText;}" +
        "var ta=document.createElement('textarea');" +
        "ta.value=text;" +
        "document.body.appendChild(ta);" +
        "ta.select();" +
        "try{document.execCommand('copy');}catch(e){}" +
        "document.body.removeChild(ta);" +
        "label.textContent='Copied';" +
        "icon.textContent='\\u2705';" +
        "setTimeout(function(){label.textContent='Copy Quiz';icon.textContent='\\uD83D\\uDCCB';},1500);" +
        "});" +
        "}" +
        "makeBtn();" +
        "if(window.__mbrowserCopyObserver){window.__mbrowserCopyObserver.disconnect();}" +
        "window.__mbrowserCopyObserver=new MutationObserver(function(){makeBtn();});" +
        "window.__mbrowserCopyObserver.observe(document.body,{childList:true,subtree:false});" +
        "if(window.__mbrowserCopyInterval){clearInterval(window.__mbrowserCopyInterval);}" +
        "window.__mbrowserCopyInterval=setInterval(makeBtn,1500);" +
        "})();";
      ref.executeScript({ code: injectedJS });
    };

    ref.addEventListener('loadstop', function () {
      inject();
      setTimeout(inject, 800);
      setTimeout(inject, 2000);
      setTimeout(inject, 4000);
    });
  } else {
    window.open(url, '_blank');
  }
}

/* ==========================================
   4. WHATSAPP GROUP BUTTON
   ========================================== */
function bindWhatsApp() {
  var btn = document.getElementById('btn-whatsapp');
  if (!btn) return;
  var waLink = 'https://chat.whatsapp.com/YOUR_GROUP_INVITE_CODE';
  btn.addEventListener('click', function () {
    openLink(waLink);
  });
}

/* ==========================================
   5. REFRESH BUTTONS
   ========================================== */
function bindRefreshButtons() {
  ['btn-refresh', 'btn-clock-refresh'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () {
      tickClock();
      loadWeather();
    });
  });
}

/* ==========================================
   6. ADDRESS BAR
   ========================================== */
function bindAddressBar() {
  var input = document.getElementById('url-input');
  if (!input) return;
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var val = input.value.trim();
      if (!val) return;
      var isLikelyUrl = /\./.test(val) || /^https?:\/\//i.test(val);
      var url;
      if (isLikelyUrl) {
        url = /^https?:\/\//i.test(val) ? val : 'https://' + val;
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(val);
      }
      openLink(url);
    }
  });

  var backBtn = document.getElementById('btn-back');
  var fwdBtn = document.getElementById('btn-forward');
  if (backBtn) backBtn.addEventListener('click', function () { history.back(); });
  if (fwdBtn) fwdBtn.addEventListener('click', function () { history.forward(); });
}

/* ==========================================
   7. TOP BAR
   ========================================== */
function bindTopBar() {
  var newTab = document.getElementById('btn-new-tab');
  if (newTab) {
    newTab.addEventListener('click', function () {
      openLink('https://www.google.com');
    });
  }
}

/* ==========================================
   HELPERS (plain link opener — no Copy button)
   ========================================== */
function setText(id, value) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

function openLink(url) {
  try {
    if (window.cordova && window.cordova.InAppBrowser) {
      cordova.InAppBrowser.open(url, '_system', 'location=yes');
    } else {
      window.open(url, '_blank');
    }
  } catch (err) {
    console.error('openLink failed:', err);
    window.location.href = url;
  }
}
