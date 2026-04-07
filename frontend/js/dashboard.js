const params = new URLSearchParams(window.location.search);
const restoredToken = params.get('restore_token');

if (restoredToken) {
  localStorage.setItem('token', restoredToken);
  params.delete('restore_token');

  const cleanQuery = params.toString();
  const cleanUrl = cleanQuery
    ? `${window.location.pathname}?${cleanQuery}`
    : window.location.pathname;

  window.history.replaceState({}, '', cleanUrl);
}

const token = localStorage.getItem('token');
const metaConnected = params.get('meta');

if (!token) {
  window.location.href = './login.html';
}

const btnVincularMeta = document.getElementById('btnVincularMeta');
const metaStatus = document.getElementById('metaStatus');
const metaIndicatorDot = document.getElementById('metaIndicatorDot');
const metaIndicatorBadge = document.getElementById('metaIndicatorBadge');
const metaIndicatorTitle = document.getElementById('metaIndicatorTitle');
const sidebarRestaurantName = document.getElementById('sidebarRestaurantName');

const kpiSpend = document.getElementById('kpiSpend');
const kpiImpressions = document.getElementById('kpiImpressions');
const kpiReach = document.getElementById('kpiReach');
const kpiClicks = document.getElementById('kpiClicks');
const refreshAdsBtn = document.getElementById('refreshAdsBtn');
const campaignSelect = document.getElementById('campaignSelect');
const regionCountrySelect = document.getElementById('regionCountrySelect');
const ageChartToggle = document.getElementById('ageChartToggle');
const regionChartTitle = document.getElementById('regionChartTitle');

let availableCountries = [];
let selectedRegionCountry = null;
let platformChartInstance = null;
let campaignChartInstance = null;
let spendChartInstance = null;
let ageChartInstance = null;
let countryChartInstance = null;
let regionChartInstance = null;

let marketAgeGenderRows = [];
let marketCountryRows = [];
let marketPlatformRows = [];

let ageChartType = 'bar';
let ageChartLabels = [];
let ageMaleValues = [];
let ageFemaleValues = [];

let allCampaignRows = [];
let currentVisibleCampaignRows = [];
let currentRestaurantId = null;
let currentAdAccountId = null;
let metaIsConnected = false;

function setMetaStatus(type, message) {
  if (!metaStatus) return;

  metaStatus.textContent = message;
  metaStatus.classList.remove(
    'status-success',
    'status-warning',
    'status-error',
    'status-info'
  );

  metaStatus.classList.add(type);
}

function setMetaButtonState({ disabled, text, styleClass }) {
  if (!btnVincularMeta) return;

  btnVincularMeta.disabled = disabled;
  btnVincularMeta.textContent = text;

  btnVincularMeta.classList.remove(
    'btn-primary',
    'btn-success',
    'btn-disabled'
  );

  if (styleClass) {
    btnVincularMeta.classList.add(styleClass);
  }
}

function setMetaPanelState({ connected, title, badgeText, tone }) {
  metaIsConnected = connected;

  if (metaIndicatorTitle) {
    metaIndicatorTitle.textContent = title;
  }

  if (metaIndicatorBadge) {
    metaIndicatorBadge.textContent = badgeText;
    metaIndicatorBadge.classList.remove('is-success', 'is-warning', 'is-error');
    metaIndicatorBadge.classList.add(tone);
  }

  if (metaIndicatorDot) {
    metaIndicatorDot.classList.remove('is-success', 'is-warning', 'is-error');
    metaIndicatorDot.classList.add(tone);
  }
}

function updateRegionTitle(country) {
  if (!regionChartTitle) return;

  regionChartTitle.textContent = country
    ? `Alcance por región (${country})`
    : 'Alcance por región';
}

const marketStudyOpenSources = document.getElementById('marketStudyOpenSources');
const marketSourcesModal = document.getElementById('marketSourcesModal');

function openMarketSourcesModal() {
  if (!marketSourcesModal) return;

  marketSourcesModal.classList.add('is-open');
  marketSourcesModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('market-modal-open');
}

function closeMarketSourcesModal() {
  if (!marketSourcesModal) return;

  marketSourcesModal.classList.remove('is-open');
  marketSourcesModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('market-modal-open');
}

function getChartSourceContainer(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return null;

  return (
    canvas.closest('article') ||
    canvas.closest('.card') ||
    canvas.closest('.chart-card') ||
    canvas.closest('.dashboard-card') ||
    canvas.parentElement
  );
}

function showChartInsightTooltip(container, text) {
  if (!container || !text) return;

  let tooltip = container.querySelector('.chart-insight-tooltip');

  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'chart-insight-tooltip';
    container.appendChild(tooltip);
  }

  const containerPosition = window.getComputedStyle(container).position;
  if (containerPosition === 'static') {
    container.style.position = 'relative';
  }

  container.style.overflow = 'visible';

  Object.assign(tooltip.style, {
    position: 'absolute',
    top: '-14px',
    left: '20px',
    right: '20px',
    zIndex: '20',
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #172033 0%, #24324d 100%)',
    color: '#ffffff',
    fontSize: '0.92rem',
    lineHeight: '1.45',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.24)',
    opacity: '0',
    transform: 'translateY(8px) scale(0.98)',
    pointerEvents: 'none',
    transition: 'opacity 0.22s ease, transform 0.22s ease'
  });

  tooltip.textContent = text;

  requestAnimationFrame(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(-6px) scale(1)';
  });

  if (container._chartInsightTooltipTimeout) {
    clearTimeout(container._chartInsightTooltipTimeout);
  }

  container._chartInsightTooltipTimeout = setTimeout(() => {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(8px) scale(0.98)';
  }, 3200);
}

function focusChartSource(chartId, insightText = '') {
  const container = getChartSourceContainer(chartId);

  if (!container) return;

  closeMarketSourcesModal();

  container.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  container.classList.remove('market-source-highlight');

  requestAnimationFrame(() => {
    container.classList.add('market-source-highlight');

    setTimeout(() => {
      container.classList.remove('market-source-highlight');
    }, 2800);
  });

  if (insightText) {
    setTimeout(() => {
      showChartInsightTooltip(container, insightText);
    }, 450);
  }
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function safeDivide(numerator, denominator) {
  if (!denominator) return 0;
  return Number(numerator || 0) / Number(denominator || 0);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('es-CO', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value || 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setElementText(id, text) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = text;
}

function getGenderLabel(gender) {
  const normalized = String(gender || '').toLowerCase();

  if (normalized === 'male' || normalized === 'm') return 'Hombres';
  if (normalized === 'female' || normalized === 'f') return 'Mujeres';
  return 'Sin género';
}

function normalizePlatformName(rawPlatform) {
  return String(rawPlatform || 'unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-CO').format(value || 0);
}

function clearVisualDashboard() {
  updateDashboardWithCampaignRows([]);
  marketAgeGenderRows = [];
  marketCountryRows = [];
  marketPlatformRows = [];
  availableCountries = [];
  selectedRegionCountry = null;
  updateRegionTitle(null);
  populateRegionCountrySelect([]);
  renderAgeChart(
    ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0]
  );
  renderCountryChart([], []);
  renderRegionChart([], []);
  renderPlatformChart([], []);
  renderMarketStudy();
}

function buildAudienceMarketRows() {
  const grouped = {};

  marketAgeGenderRows.forEach(row => {
    const age = row.age || 'Desconocido';
    const gender = getGenderLabel(row.gender);
    const reach = Number(row.reach || 0);
    const key = `${age} / ${gender}`;

    if (!grouped[key]) {
      grouped[key] = 0;
    }

    grouped[key] += reach;
  });

  return Object.entries(grouped)
    .map(([segment, reach]) => ({ segment, reach }))
    .sort((a, b) => b.reach - a.reach);
}

function buildLocationMarketRows() {
  const grouped = {};

  marketCountryRows.forEach(row => {
    const location = row.country || 'Sin país';
    const reach = Number(row.reach || 0);

    if (!grouped[location]) {
      grouped[location] = 0;
    }

    grouped[location] += reach;
  });

  return Object.entries(grouped)
    .map(([location, reach]) => ({ location, reach }))
    .sort((a, b) => b.reach - a.reach);
}

function buildPlatformMarketRows() {
  const grouped = {};

  marketPlatformRows.forEach(row => {
    const platform = normalizePlatformName(row.publisher_platform || 'unknown');
    const reach = Number(row.reach || 0);

    if (!grouped[platform]) {
      grouped[platform] = 0;
    }

    grouped[platform] += reach;
  });

  return Object.entries(grouped)
    .map(([platform, reach]) => ({ platform, reach }))
    .sort((a, b) => b.reach - a.reach);
}

function buildCampaignMarketRows() {
  const sourceRows = currentVisibleCampaignRows.length ? currentVisibleCampaignRows : allCampaignRows;

  return sourceRows
    .map(row => {
      const name = row.campaign_name || 'Sin nombre';
      const spend = Number(row.spend || 0);
      const impressions = Number(row.impressions || 0);
      const reach = Number(row.reach || 0);
      const clicks = Number(row.clicks || 0);
      const ctr = safeDivide(clicks, impressions);
      const cpc = safeDivide(spend, clicks);

      return {
        name,
        spend,
        impressions,
        reach,
        clicks,
        ctr,
        cpc
      };
    })
    .sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks;
      return a.cpc - b.cpc;
    });
}

function renderAudienceMarketTable(rows) {
  const tbody = document.getElementById('marketAudienceTableBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3">Sin datos disponibles</td></tr>`;
    return;
  }

  const totalReach = rows.reduce((sum, row) => sum + row.reach, 0);

  tbody.innerHTML = rows.slice(0, 5).map(row => `
    <tr>
      <td>${escapeHtml(row.segment)}</td>
      <td>${formatNumber(row.reach)}</td>
      <td>${formatPercent(safeDivide(row.reach, totalReach))}</td>
    </tr>
  `).join('');
}

function renderLocationMarketTable(rows) {
  const tbody = document.getElementById('marketLocationTableBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3">Sin datos disponibles</td></tr>`;
    return;
  }

  const totalReach = rows.reduce((sum, row) => sum + row.reach, 0);

  tbody.innerHTML = rows.slice(0, 5).map(row => `
    <tr>
      <td>${escapeHtml(row.location)}</td>
      <td>${formatNumber(row.reach)}</td>
      <td>${formatPercent(safeDivide(row.reach, totalReach))}</td>
    </tr>
  `).join('');
}

function renderCampaignMarketTable(rows) {
  const tbody = document.getElementById('marketCampaignTableBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5">Sin datos disponibles</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.slice(0, 5).map(row => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${formatNumber(row.clicks)}</td>
      <td>${formatPercent(row.ctr)}</td>
      <td>${formatCurrency(row.cpc)}</td>
      <td>${formatCurrency(row.spend)}</td>
    </tr>
  `).join('');
}

function renderMarketInsights(insights) {
  const list = document.getElementById('marketInsightsList');
  if (!list) return;

  if (!insights.length) {
    list.innerHTML = `<li>No hay suficientes datos para generar insights automáticos.</li>`;
    return;
  }

  list.innerHTML = insights.map(item => `
    <li>
      <button
        type="button"
        class="market-insight-link"
        data-chart-target="${escapeHtml(item.chartId || '')}"
        data-insight-text="${escapeHtml(item.text || '')}"
      >
        ${escapeHtml(item.text)}
      </button>
    </li>
  `).join('');
}

function renderMarketStudy() {
  const audienceRows = buildAudienceMarketRows();
  const locationRows = buildLocationMarketRows();
  const platformRows = buildPlatformMarketRows();
  const campaignRows = buildCampaignMarketRows();

  const bestAudience = audienceRows[0];
  const bestLocation = locationRows[0];
  const bestPlatform = platformRows[0];
  const bestCampaign = campaignRows[0];

  const totalAudienceReach = audienceRows.reduce((sum, row) => sum + row.reach, 0);
  const totalLocationReach = locationRows.reduce((sum, row) => sum + row.reach, 0);
  const totalPlatformReach = platformRows.reduce((sum, row) => sum + row.reach, 0);

  setElementText(
    'marketTopAudienceValue',
    bestAudience ? bestAudience.segment : 'Sin datos'
  );
  setElementText(
    'marketTopAudienceMeta',
    bestAudience
      ? `Alcance ${formatCompactNumber(bestAudience.reach)} · Participación ${formatPercent(safeDivide(bestAudience.reach, totalAudienceReach))}`
      : 'Aún no hay suficiente información.'
  );

  setElementText(
    'marketTopLocationValue',
    bestLocation ? bestLocation.location : 'Sin datos'
  );
  setElementText(
    'marketTopLocationMeta',
    bestLocation
      ? `Alcance ${formatCompactNumber(bestLocation.reach)} · Participación ${formatPercent(safeDivide(bestLocation.reach, totalLocationReach))}`
      : 'Aún no hay suficiente información.'
  );

  setElementText(
    'marketTopPlatformValue',
    bestPlatform ? bestPlatform.platform : 'Sin datos'
  );
  setElementText(
    'marketTopPlatformMeta',
    bestPlatform
      ? `Alcance ${formatCompactNumber(bestPlatform.reach)} · Participación ${formatPercent(safeDivide(bestPlatform.reach, totalPlatformReach))}`
      : 'Aún no hay suficiente información.'
  );

  setElementText(
    'marketTopCampaignValue',
    bestCampaign ? bestCampaign.name : 'Sin datos'
  );
  setElementText(
    'marketTopCampaignMeta',
    bestCampaign
      ? `Clics ${formatNumber(bestCampaign.clicks)} · CTR ${formatPercent(bestCampaign.ctr)} · CPC ${formatCurrency(bestCampaign.cpc)}`
      : 'Aún no hay suficiente información.'
  );

  renderAudienceMarketTable(audienceRows);
  renderLocationMarketTable(locationRows);
  renderCampaignMarketTable(campaignRows);

  const insights = [];

  if (bestAudience) {
    insights.push({
      text: `El segmento ${bestAudience.segment} concentra la mayor respuesta demográfica del periodo.`,
      chartId: 'ageChart'
    });
  }

  if (bestPlatform) {
    insights.push({
      text: `${bestPlatform.platform} lidera la distribución de alcance entre las plataformas medidas.`,
      chartId: 'platformChart'
    });
  }

  if (bestLocation) {
    insights.push({
      text: `${bestLocation.location} es la ubicación con mayor volumen de respuesta publicitaria.`,
      chartId: 'countryChart'
    });
  }

  if (bestCampaign) {
    insights.push({
      text: `La campaña "${bestCampaign.name}" lidera en clics con un CTR de ${formatPercent(bestCampaign.ctr)} y un CPC de ${formatCurrency(bestCampaign.cpc)}.`,
      chartId: 'campaignChart'
    });
  }

  if (bestCampaign && bestCampaign.ctr >= 0.02) {
    insights.push({
      text: `La campaña líder muestra una afinidad creativa positiva porque supera el 2.0% de CTR.`,
      chartId: 'campaignChart'
    });
  } else if (bestCampaign && bestCampaign.ctr > 0) {
    insights.push({
      text: `La campaña líder todavía tiene margen para mejorar atracción creativa y mensaje publicitario.`,
      chartId: 'campaignChart'
    });
  }

  renderMarketInsights(insights);

  setElementText(
    'marketConclusionSignal',
    bestAudience && bestPlatform
      ? `La mayor señal del mercado está en ${bestAudience.segment} y en ${bestPlatform.platform}.`
      : 'Aún no hay suficientes señales para identificar un patrón dominante.'
  );

  setElementText(
    'marketConclusionReading',
    bestLocation && bestCampaign
      ? `La respuesta publicitaria se concentra en ${bestLocation.location} y la referencia del periodo es la campaña "${bestCampaign.name}".`
      : 'Todavía no hay suficiente volumen para construir una lectura sólida del periodo.'
  );

  setElementText(
    'marketConclusionAction',
    bestAudience && bestPlatform && bestLocation
      ? `Próximo paso: crear campañas específicas para ${bestAudience.segment}, reforzar ${bestPlatform.platform} y probar variantes geográficas comenzando por ${bestLocation.location}.`
      : 'Próximo paso: mantener campañas activas hasta reunir volumen suficiente para segmentar con confianza.'
  );
}

function renderCampaignChart(labels, data) {
  const canvas = document.getElementById('campaignChart');
  if (!canvas) return;

  if (campaignChartInstance) {
    campaignChartInstance.destroy();
  }

  campaignChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Clics',
        data,
        backgroundColor: '#1877f2',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderSpendChart(labels, data) {
  const canvas = document.getElementById('spendChart');
  if (!canvas) return;

  if (spendChartInstance) {
    spendChartInstance.destroy();
  }

  spendChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#1877f2',
          '#12b76a',
          '#f79009',
          '#7a5af8',
          '#ef4444',
          '#06b6d4',
          '#84cc16'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderAgeChart(labels, maleData, femaleData) {
  const canvas = document.getElementById('ageChart');
  if (!canvas) return;

  ageChartLabels = labels;
  ageMaleValues = maleData;
  ageFemaleValues = femaleData;

  if (ageChartInstance) {
    ageChartInstance.destroy();
  }

  const totalByAge = labels.map((_, index) => {
    return Number(maleData[index] || 0) + Number(femaleData[index] || 0);
  });

  ageChartInstance = new Chart(canvas, {
    type: ageChartType,
    data: {
      labels,
      datasets: ageChartType === 'bar'
        ? [
            {
              label: 'Hombres',
              data: maleData,
              backgroundColor: '#5b3cc4',
              borderColor: '#5b3cc4',
              borderWidth: 1,
              borderRadius: 6
            },
            {
              label: 'Mujeres',
              data: femaleData,
              backgroundColor: '#39c6c6',
              borderColor: '#39c6c6',
              borderWidth: 1,
              borderRadius: 6
            }
          ]
        : [
            {
              label: 'Total por edad',
              data: totalByAge,
              backgroundColor: [
                '#1877f2',
                '#12b76a',
                '#f79009',
                '#7a5af8',
                '#ef4444',
                '#06b6d4',
                '#84cc16'
              ],
              borderWidth: 1
            }
          ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      },
      scales: ageChartType === 'bar'
        ? {
            x: {
              stacked: false
            },
            y: {
              beginAtZero: true
            }
          }
        : {}
    }
  });

  if (ageChartToggle) {
    ageChartToggle.textContent = ageChartType === 'bar' ? 'Ver pastel' : 'Ver barras';
  }
}

function renderCountryChart(labels, data) {
  const canvas = document.getElementById('countryChart');
  if (!canvas) return;

  if (countryChartInstance) {
    countryChartInstance.destroy();
  }

  countryChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Alcance',
        data,
        backgroundColor: '#12b76a',
        borderRadius: 8,
        barPercentage: 0.6,
        categoryPercentage: 0.7
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true
        },
        y: {
          ticks: {
            autoSkip: false
          }
        }
      }
    }
  });
}

function renderRegionChart(labels, data) {
  const canvas = document.getElementById('regionChart');
  if (!canvas) return;

  if (regionChartInstance) {
    regionChartInstance.destroy();
  }

  regionChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Alcance',
        data,
        backgroundColor: '#7a5af8',
        borderRadius: 8,
        barPercentage: 0.6,
        categoryPercentage: 0.7
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true
        },
        y: {
          ticks: {
            autoSkip: false
          }
        }
      }
    }
  });
}

function renderPlatformChart(labels, data) {
  const canvas = document.getElementById('platformChart');
  if (!canvas) return;

  if (platformChartInstance) {
    platformChartInstance.destroy();
  }

  platformChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Alcance',
        data,
        backgroundColor: ['#1877f2', '#E1306C', '#12b76a', '#7a5af8'],
        borderRadius: 8,
        barPercentage: 0.6,
        categoryPercentage: 0.7
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true
        },
        y: {
          ticks: {
            autoSkip: false
          }
        }
      }
    }
  });
}

function populateRegionCountrySelect(countries) {
  if (!regionCountrySelect) return;

  regionCountrySelect.innerHTML = '';

  if (!countries || countries.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Sin países';
    regionCountrySelect.appendChild(option);
    regionCountrySelect.disabled = true;
    return;
  }

  regionCountrySelect.disabled = false;

  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;

    if (country === selectedRegionCountry) {
      option.selected = true;
    }

    regionCountrySelect.appendChild(option);
  });
}

async function loadCountryDemographics(restaurantId, adAccountId, campaignId = 'all') {
  try {
    let url = `http://localhost:3000/api/meta/demographics-country/${restaurantId}/${adAccountId}`;

    if (campaignId && campaignId !== 'all') {
      url += `?campaign_id=${encodeURIComponent(campaignId)}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (!res.ok || !result.data || result.data.length === 0) {
      marketCountryRows = [];
      availableCountries = [];
      selectedRegionCountry = null;
      populateRegionCountrySelect([]);
      updateRegionTitle(null);
      renderCountryChart([], []);
      renderRegionChart([], []);
      return;
    }

    const sortedRows = [...result.data]
      .sort((a, b) => Number(b.reach || 0) - Number(a.reach || 0));

    marketCountryRows = sortedRows;

    const labels = sortedRows.map(row => row.country || 'Sin país');
    const data = sortedRows.map(row => Number(row.reach || 0));

    renderCountryChart(labels, data);

    availableCountries = [...new Set(sortedRows.map(row => row.country).filter(Boolean))];

    if (!availableCountries.includes(selectedRegionCountry)) {
      selectedRegionCountry = availableCountries[0] || null;
    }

    populateRegionCountrySelect(availableCountries);
    updateRegionTitle(selectedRegionCountry);

    if (selectedRegionCountry) {
      await loadRegionDemographics(restaurantId, adAccountId, campaignId, selectedRegionCountry);
    } else {
      renderRegionChart([], []);
    }
  } catch (error) {
    console.error('Error cargando demografía por país:', error);
    marketCountryRows = [];
    renderCountryChart([], []);
    renderRegionChart([], []);
  }
}

async function loadRegionDemographics(restaurantId, adAccountId, campaignId = 'all', country = null) {
  try {
    const params = new URLSearchParams();

    if (campaignId && campaignId !== 'all') {
      params.append('campaign_id', campaignId);
    }

    if (country) {
      params.append('country', country);
    }

    let url = `http://localhost:3000/api/meta/demographics-region/${restaurantId}/${adAccountId}`;
    const queryString = params.toString();

    if (queryString) {
      url += `?${queryString}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (!res.ok || !result.data || result.data.length === 0) {
      renderRegionChart([], []);
      return;
    }

    const sortedRows = [...result.data]
      .sort((a, b) => Number(b.reach || 0) - Number(a.reach || 0))
      .slice(0, 10);

    const labels = sortedRows.map(row => row.region || 'Sin región');
    const data = sortedRows.map(row => Number(row.reach || 0));

    renderRegionChart(labels, data);
  } catch (error) {
    console.error('Error cargando demografía por región:', error);
    renderRegionChart([], []);
  }
}

async function loadPlatformDemographics(restaurantId, adAccountId, campaignId = 'all') {
  try {
    let url = `http://localhost:3000/api/meta/demographics-platform/${restaurantId}/${adAccountId}`;

    if (campaignId && campaignId !== 'all') {
      url += `?campaign_id=${encodeURIComponent(campaignId)}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (!res.ok || !result.data || result.data.length === 0) {
      marketPlatformRows = [];
      renderPlatformChart([], []);
      return;
    }

    marketPlatformRows = result.data;

    const grouped = {};

    result.data.forEach(row => {
      const rawPlatform = row.publisher_platform || 'unknown';
      const platform = rawPlatform
        .replaceAll('_', ' ')
        .replace(/\b\w/g, char => char.toUpperCase());

      const reach = Number(row.reach || 0);

      if (!grouped[platform]) {
        grouped[platform] = 0;
      }

      grouped[platform] += reach;
    });

    const sortedEntries = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1]);

    const labels = sortedEntries.map(([label]) => label);
    const data = sortedEntries.map(([, value]) => value);

    renderPlatformChart(labels, data);
  } catch (error) {
    console.error('Error cargando demografía por plataforma:', error);
    marketPlatformRows = [];
    renderPlatformChart([], []);
  }
}

function populateCampaignSelect(rows) {
  if (!campaignSelect) return;

  campaignSelect.innerHTML = '<option value="all">Todas las campañas</option>';

  const uniqueCampaigns = [];
  const seen = new Set();

  rows.forEach(row => {
    const campaignId = String(row.campaign_id || '').trim();
    const campaignName = row.campaign_name || 'Sin nombre';

    if (!campaignId || seen.has(campaignId)) return;

    seen.add(campaignId);
    uniqueCampaigns.push({
      campaign_id: campaignId,
      campaign_name: campaignName
    });
  });

  uniqueCampaigns.forEach(campaign => {
    const option = document.createElement('option');
    option.value = campaign.campaign_id;
    option.textContent = campaign.campaign_name;
    campaignSelect.appendChild(option);
  });
}

function updateDashboardWithCampaignRows(rows) {
  currentVisibleCampaignRows = rows;

  const totalSpend = rows.reduce((sum, row) => sum + Number(row.spend || 0), 0);
  const totalImpressions = rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const totalReach = rows.reduce((sum, row) => sum + Number(row.reach || 0), 0);
  const totalClicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);

  if (kpiSpend) kpiSpend.textContent = formatCurrency(totalSpend);
  if (kpiImpressions) kpiImpressions.textContent = formatNumber(totalImpressions);
  if (kpiReach) kpiReach.textContent = formatNumber(totalReach);
  if (kpiClicks) kpiClicks.textContent = formatNumber(totalClicks);

  const campaignLabels = rows.map(row => row.campaign_name || 'Sin nombre');
  const clicksData = rows.map(row => Number(row.clicks || 0));
  const spendData = rows.map(row => Number(row.spend || 0));

  renderCampaignChart(campaignLabels, clicksData);
  renderSpendChart(campaignLabels, spendData);
}

async function applyCampaignFilter() {
  if (!campaignSelect) return;

  const selectedCampaignId = String(campaignSelect.value).trim();

  if (selectedCampaignId === 'all') {
    updateDashboardWithCampaignRows(allCampaignRows);

    if (currentRestaurantId && currentAdAccountId) {
      await loadAgeInsights(currentRestaurantId, currentAdAccountId, 'all');
      await loadCountryDemographics(currentRestaurantId, currentAdAccountId, 'all');
      await loadPlatformDemographics(currentRestaurantId, currentAdAccountId, 'all');
    }

    renderMarketStudy();
    return;
  }

  const filteredRows = allCampaignRows.filter(row => {
    return String(row.campaign_id || '').trim() === selectedCampaignId;
  });

  updateDashboardWithCampaignRows(filteredRows);

  if (currentRestaurantId && currentAdAccountId) {
    await loadAgeInsights(currentRestaurantId, currentAdAccountId, selectedCampaignId);
    await loadCountryDemographics(currentRestaurantId, currentAdAccountId, selectedCampaignId);
    await loadPlatformDemographics(currentRestaurantId, currentAdAccountId, selectedCampaignId);
  }

  renderMarketStudy();
}

async function loadAdsDashboard(restaurantId) {
  currentRestaurantId = String(restaurantId);

  try {
    const adAccountsRes = await fetch(`http://localhost:3000/api/meta/adaccounts/${restaurantId}`);
    const adAccountsResult = await adAccountsRes.json();

    if (!adAccountsRes.ok || !adAccountsResult.data || adAccountsResult.data.length === 0) {
      currentAdAccountId = null;
      allCampaignRows = [];
      currentVisibleCampaignRows = [];
      clearVisualDashboard();

      await loadMetaStatus(restaurantId);
      return;
    }

    const firstAccountId = adAccountsResult.data[0].id.replace('act_', '');
    currentAdAccountId = firstAccountId;

    const insightsRes = await fetch(`http://localhost:3000/api/meta/insights/${restaurantId}/${firstAccountId}`);
    const insightsResult = await insightsRes.json();

    if (!insightsRes.ok || !insightsResult.data || insightsResult.data.length === 0) {
      allCampaignRows = [];
      currentVisibleCampaignRows = [];
      clearVisualDashboard();

      await loadMetaStatus(restaurantId);
      return;
    }

    const rows = insightsResult.data;
    allCampaignRows = rows;
    currentVisibleCampaignRows = rows;

    populateCampaignSelect(rows);
    updateDashboardWithCampaignRows(rows);

    await loadAgeInsights(restaurantId, firstAccountId, 'all');
    await loadCountryDemographics(restaurantId, firstAccountId, 'all');
    await loadPlatformDemographics(restaurantId, firstAccountId, 'all');
    renderMarketStudy();

    await loadMetaStatus(restaurantId);
  } catch (error) {
    console.error('Error cargando dashboard de publicidad:', error);

    currentAdAccountId = null;
    allCampaignRows = [];
    currentVisibleCampaignRows = [];
    clearVisualDashboard();

    await loadMetaStatus(restaurantId);
  }
}

async function loadAgeInsights(restaurantId, adAccountId, campaignId = 'all') {
  try {
    let url = `http://localhost:3000/api/meta/insights-age/${restaurantId}/${adAccountId}`;

    if (campaignId && campaignId !== 'all') {
      url += `?campaign_id=${encodeURIComponent(campaignId)}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    const ageRanges = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const maleData = new Array(ageRanges.length).fill(0);
    const femaleData = new Array(ageRanges.length).fill(0);

    if (!res.ok || !result.data || result.data.length === 0) {
      marketAgeGenderRows = [];
      renderAgeChart(ageRanges, maleData, femaleData);
      return;
    }

    marketAgeGenderRows = result.data;

    result.data.forEach(row => {
      const age = row.age || 'Desconocido';
      const gender = (row.gender || '').toLowerCase();
      const reach = Number(row.reach || 0);

      const index = ageRanges.indexOf(age);
      if (index === -1) return;

      if (gender === 'male' || gender === 'm') {
        maleData[index] += reach;
      } else if (gender === 'female' || gender === 'f') {
        femaleData[index] += reach;
      }
    });

    renderAgeChart(ageRanges, maleData, femaleData);
  } catch (error) {
    console.error('Error cargando insights por edad:', error);
    marketAgeGenderRows = [];
    renderAgeChart(
      ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    );
  }
}

async function loadProfile() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Error al cargar perfil');
    }

    document.getElementById('welcome').textContent = `Bienvenido, ${result.restaurant.name}`;

    if (sidebarRestaurantName) {
      sidebarRestaurantName.textContent = result.restaurant.name || 'Restaurante';
    }

    const restaurantId = String(result.restaurant.id);
    currentRestaurantId = restaurantId;

    localStorage.setItem('restaurant_id', restaurantId);
    localStorage.setItem('restaurantId', restaurantId);

    await loadMetaStatus(restaurantId);
    await loadAdsDashboard(restaurantId);

    setInterval(() => {
      loadAdsDashboard(restaurantId);
    }, 8 * 60 * 60 * 1000);

    if (metaConnected === 'connected') {
      await loadMetaStatus(restaurantId);

      if (metaIsConnected) {
        setMetaStatus('status-success', 'Meta vinculada correctamente.');
      }
    }
  } catch (error) {
    console.error(error);
    localStorage.removeItem('token');
    localStorage.removeItem('restaurant');
    localStorage.removeItem('restaurant_id');
    localStorage.removeItem('restaurantId');
    window.location.href = './login.html';
  }
}

async function loadMetaStatus(restaurantId) {
  try {
    const res = await fetch(`http://localhost:3000/api/meta/status/${restaurantId}`);
    const result = await res.json();

    if (result.connected) {
      setMetaStatus(
        'status-success',
        `Meta ya vinculada con ${result.connection.meta_user_name}`
      );

      setMetaButtonState({
        disabled: true,
        text: 'Meta ya vinculada',
        styleClass: 'btn-disabled'
      });

      setMetaPanelState({
        connected: true,
        title: 'Meta vinculada',
        badgeText: 'Vinculada',
        tone: 'is-success'
      });

      return;
    }

    setMetaStatus('status-warning', 'Meta no vinculada.');

    setMetaButtonState({
      disabled: false,
      text: 'Vincular Meta',
      styleClass: 'btn-primary'
    });

    setMetaPanelState({
      connected: false,
      title: 'Conexión pendiente',
      badgeText: 'No vinculada',
      tone: 'is-warning'
    });
  } catch (error) {
    console.error(error);

    setMetaStatus('status-error', 'No se pudo verificar el estado de Meta.');

    setMetaButtonState({
      disabled: false,
      text: 'Vincular Meta',
      styleClass: 'btn-primary'
    });

    setMetaPanelState({
      connected: false,
      title: 'Revisar conexión',
      badgeText: 'Error',
      tone: 'is-error'
    });
  }
}

loadProfile();
renderMarketStudy();

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('restaurant');
  localStorage.removeItem('restaurant_id');
  window.location.href = './login.html';
});

if (btnVincularMeta) {
  btnVincularMeta.addEventListener('click', () => {
    const token = localStorage.getItem('token');

    if (!token) {
      window.location.href = './login.html';
      return;
    }

    const storedRestaurantId =
      currentRestaurantId ||
      localStorage.getItem('restaurant_id') ||
      localStorage.getItem('restaurantId');

    if (!storedRestaurantId) {
      setMetaStatus('status-error', 'No se encontró el restaurante autenticado.');
      return;
    }

    currentRestaurantId = String(storedRestaurantId);

    const connectUrl = new URL('http://localhost:3000/api/meta/connect');
    connectUrl.searchParams.set('restaurant_id', currentRestaurantId);
    connectUrl.searchParams.set('app_token', token);

    window.location.href = connectUrl.toString();
  });
}

if (ageChartToggle) {
  ageChartToggle.addEventListener('click', () => {
    if (!ageChartLabels.length) return;

    ageChartType = ageChartType === 'bar' ? 'pie' : 'bar';
    renderAgeChart(ageChartLabels, ageMaleValues, ageFemaleValues);
  });
}

async function refreshAdsDataManually() {
  const restaurantId = localStorage.getItem('restaurant_id');

  if (!restaurantId) {
    setMetaStatus('status-error', 'No se encontró el restaurante logueado.');
    return;
  }

  if (refreshAdsBtn) {
    refreshAdsBtn.disabled = true;
    refreshAdsBtn.textContent = 'Actualizando...';
  }

  try {
    await loadAdsDashboard(restaurantId);
    setMetaStatus('status-success', 'Datos de Meta actualizados manualmente.');
  } catch (error) {
    console.error('Error en actualización manual:', error);
    setMetaStatus('status-error', 'No se pudieron actualizar los datos.');
  } finally {
    if (refreshAdsBtn) {
      refreshAdsBtn.disabled = false;
      refreshAdsBtn.textContent = 'Actualizar datos';
    }
  }
}

if (refreshAdsBtn) {
  refreshAdsBtn.addEventListener('click', refreshAdsDataManually);
}

if (campaignSelect) {
  campaignSelect.addEventListener('change', applyCampaignFilter);
}

if (regionCountrySelect) {
  regionCountrySelect.addEventListener('change', async (event) => {
    selectedRegionCountry = event.target.value;
    updateRegionTitle(selectedRegionCountry);

    if (currentRestaurantId && currentAdAccountId && selectedRegionCountry) {
      const selectedCampaignId = campaignSelect ? campaignSelect.value : 'all';

      await loadRegionDemographics(
        currentRestaurantId,
        currentAdAccountId,
        selectedCampaignId,
        selectedRegionCountry
      );
    }
  });
}

if (marketStudyOpenSources) {
  marketStudyOpenSources.addEventListener('click', openMarketSourcesModal);
}

if (marketSourcesModal) {
  marketSourcesModal.addEventListener('click', (event) => {
    const closeTrigger = event.target.closest('[data-close-market-sources]');
    if (closeTrigger) {
      closeMarketSourcesModal();
      return;
    }

    const sourceCard = event.target.closest('[data-chart-target]');
    if (sourceCard) {
      const chartId = sourceCard.getAttribute('data-chart-target');
      focusChartSource(chartId);
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMarketSourcesModal();
  }
});

const marketInsightsList = document.getElementById('marketInsightsList');

if (marketInsightsList) {
  marketInsightsList.addEventListener('click', (event) => {
    const insightButton = event.target.closest('[data-chart-target]');
    if (!insightButton) return;

    const chartId = insightButton.getAttribute('data-chart-target');
    const insightText =
      insightButton.getAttribute('data-insight-text') ||
      insightButton.textContent.trim();

    if (!chartId) return;

    focusChartSource(chartId, insightText);
  });
}