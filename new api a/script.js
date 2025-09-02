// script.js — (yangilangan)
// RapidAPI Open-Weather key va host
const API_KEY = '20077f6b13mshca19aed59f37f31p150e30jsn4c528405202a';
const API_HOST = 'open-weather13.p.rapidapi.com';

const regions = [
    { name: 'Tashkent', lat: 41.311081, lon: 69.240562 },
    { name: 'Samarkand', lat: 39.652451, lon: 66.970139 },
    { name: 'Bukhara', lat: 39.7747, lon: 64.4300 },
    { name: 'Nukus', lat: 42.4667, lon: 59.6167 },
    { name: 'Namangan', lat: 41.0149, lon: 71.6494 },
    { name: 'Andijan', lat: 40.7828, lon: 72.3442 },
    { name: 'Fergana', lat: 40.3894, lon: 71.7847 },
    { name: 'Jizzakh', lat: 40.1158, lon: 67.8447 },
    { name: 'Navoiy', lat: 40.1033, lon: 65.3716 },
    { name: 'Qarshi', lat: 38.8598, lon: 65.7842 },
    { name: 'Termez', lat: 37.2088, lon: 67.2765 },
    { name: 'Gulistan', lat: 40.9242, lon: 68.7747 },
    { name: 'Urgench', lat: 41.5517, lon: 60.6306 }
];

const grid = document.getElementById('weatherGrid');
const refreshBtn = document.getElementById('refreshBtn');

refreshBtn?.addEventListener('click', () => {
    loadAllRegions();
});

function fetchOptions() {
    return {
        method: 'GET',
        headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': API_HOST
        }
    };
}

// Convert possible Kelvin -> Celsius if needed
function formatTemp(t) {
    if (t == null) return '—';
    const n = Number(t);
    if (Number.isNaN(n)) return String(t);
    // Agar juda katta (masalan > 90) ehtimol Kelvin
    if (n > 90) return `${(n - 273.15).toFixed(1)}°C`;
    return `${n.toFixed(1)}°C`;
}

async function fetchForecastByCoords(lat, lon) {
    // Biz fivedaysforcast endpointni ishlatamiz (latitude+longitude)
    const url = `https://${API_HOST}/fivedaysforcast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&lang=EN`;
    const opts = fetchOptions();

    const res = await fetch(url, opts);
    if (!res.ok) {
        // return a descriptive error
        throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    return json;
}

function createCardSkeleton(city) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
    <div class="top">
      <div>
        <div class="city">${city}</div>
        <div class="small">Yuklanmoqda...</div>
      </div>
      <div><span class="badge">—</span></div>
    </div>
    <div class="meta"></div>
  `;
    return el;
}

function renderError(cardEl, message) {
    const topSmall = cardEl.querySelector('.top .small');
    const badge = cardEl.querySelector('.badge');
    const meta = cardEl.querySelector('.meta');
    topSmall.textContent = `Xato: ${message}`;
    badge.textContent = '!';
    badge.style.background = '#fff0f0';
    badge.style.color = '#ef4444';
    meta.innerHTML = `<div class="error">${message}</div>`;
}

function renderForecast(data, cardEl) {
    const topSmall = cardEl.querySelector('.top .small');
    const badge = cardEl.querySelector('.badge');
    const meta = cardEl.querySelector('.meta');

    if (!data || data.error) {
        renderError(cardEl, data?.message || 'Ma\'lumot yoʻq');
        return;
    }


    let days = null;
    if (Array.isArray(data.weather)) days = data.weather;
    else if (Array.isArray(data.list)) days = data.list;
    else if (Array.isArray(data.data)) days = data.data;
    else days = null;


    let name = data.name ?? (data.city?.name) ?? '—';
    let mainTemp = null;
    if (data.main && typeof data.main.temp !== 'undefined') mainTemp = data.main.temp;
    else if (data.current && typeof data.current.temp_c !== 'undefined') mainTemp = data.current.temp_c;
    else if (days && days[0] && (days[0].temp || days[0].main?.temp || days[0].temp_c)) {
        mainTemp = days[0].temp ?? days[0].main?.temp ?? days[0].temp_c;
    }

    const desc = (data.weather && data.weather[0] && data.weather[0].description)
        ? data.weather[0].description
        : (data.current?.condition?.text ?? (days && days[0] && (days[0].weather?.[0]?.description || days[0].condition)) ?? '—');

    const humidity = data.main?.humidity ?? data.current?.humidity ?? (data.weather && data.weather[0]?.humidity) ?? '—';
    const wind = data.wind?.speed ?? data.current?.wind_kph ?? '—';

    cardEl.querySelector('.city').textContent = name;
    topSmall.textContent = desc;
    badge.textContent = formatTemp(mainTemp);

    meta.innerHTML = `
    <div class="small">Namlik: ${humidity !== '—' ? humidity + (String(humidity).includes('%') ? '' : '%') : '—'}</div>
    <div class="small">Shamol: ${wind !== '—' ? (String(wind).includes('m/s') ? wind : wind + ' m/s') : '—'}</div>
  `;

    if (days && days.length > 0) {
        const dayList = document.createElement('div');
        dayList.className = 'daylist';
        days.slice(0, 5).forEach(d => {
            const dayEl = document.createElement('div');
            dayEl.className = 'day';
            const date = d.date ?? d.dt_txt ?? d.datetime ?? (d.dt ? new Date(d.dt * 1000).toLocaleDateString() : '—');
            const t = (d.max_temp ?? d.temp_max ?? d.temp ?? d.main?.temp ?? d.temp_c) ?? null;
            dayEl.innerHTML = `<div style="font-weight:700">${date}</div><div class="small">${formatTemp(t)}</div>`;
            dayList.appendChild(dayEl);
        });
        meta.appendChild(dayList);
    }
}

async function loadAllRegions() {
    grid.innerHTML = '';
    const skeletons = {};
    regions.forEach(r => {
        const card = createCardSkeleton(r.name);
        grid.appendChild(card);
        skeletons[r.name] = { el: card, coords: { lat: r.lat, lon: r.lon } };
    });

    // Parallel fetch
    const promises = regions.map(r => fetchForecastByCoords(r.lat, r.lon).then(
        data => ({ ok:true, data }), err => ({ ok:false, err }))
    );

    const results = await Promise.all(promises);

    results.forEach((res, idx) => {
        const city = regions[idx].name;
        const card = skeletons[city].el;
        if (res.ok) {
            renderForecast(res.data, card);
        } else {
            renderError(card, res.err?.message || 'Fetch failed');
        }
    });
}

loadAllRegions();
