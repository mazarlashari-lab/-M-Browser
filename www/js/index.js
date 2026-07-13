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
  'btn-quiz': 'https://quiz.aiou.edu.pk',
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
   3B. QUIZ PAGE — opens in-app with floating Copy button
   ========================================== */
function openQuizLink(url) {
  if (window.cordova && window.cordova.InAppBrowser) {
    var ref = cordova.InAppBrowser.open(url, '_blank', 'location=yes,toolbar=yes,zoom=yes');

    ref.addEventListener('loadstop', function () {
      var injectedJS =
        "(function(){" +
        "if(document.getElementById('mbrowser-copy-btn'))return;" +
        "var btn=document.createElement('button');" +
        "btn.id='mbrowser-copy-btn';" +
        "btn.innerText='📋 Copy';" +
        "btn.style.position='fixed';" +
        "btn.style.bottom='20px';" +
        "btn.style.right='20px';" +
        "btn.style.zIndex='999999';" +
        "btn.style.background='#1565d8';" +
        "btn.style.color='#fff';" +
        "btn.style.border='none';" +
        "btn.style.borderRadius='999px';" +
        "btn.style.padding='12px 18px';" +
        "btn.style.fontSize='15px';" +
        "btn.style.fontWeight='600';" +
        "btn.style.boxShadow='0 4px 14px rgba(0,0,0,0.35)';" +
        "document.body.appendChild(btn);" +
        "btn.addEventListener('click',function(){" +
        "var text=window.getSelection().toString();" +
        "if(!text){text=document.body.innerText;}" +
        "var ta=document.createElement('textarea');" +
        "ta.value=text;" +
        "document.body.appendChild(ta);" +
        "ta.select();" +
        "try{document.execCommand('copy');}catch(e){}" +
        "document.body.removeChild(ta);" +
        "btn.innerText='✅ Copied';" +
        "setTimeout(function(){btn.innerText='📋 Copy';},1500);" +
        "});" +
        "})();";
      ref.executeScript({ code: injectedJS });
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
   HELPERS
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
