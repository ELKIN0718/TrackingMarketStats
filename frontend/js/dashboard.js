const token = localStorage.getItem('token');

const params = new URLSearchParams(window.location.search);
const metaConnected = params.get('meta');

if (!token) {
  window.location.href = './login.html';
}

const btnVincularMeta = document.getElementById('btnVincularMeta');
const metaStatus = document.getElementById('metaStatus');

// graficas
const kpiSpend = document.getElementById('kpiSpend');
const kpiImpressions = document.getElementById('kpiImpressions');
const kpiReach = document.getElementById('kpiReach');
const kpiClicks = document.getElementById('kpiClicks');
const refreshAdsBtn = document.getElementById('refreshAdsBtn');
const campaignSelect = document.getElementById('campaignSelect');

const regionCountrySelect = document.getElementById('regionCountrySelect');

let availableCountries = [];
let selectedRegionCountry = null;
let platformChartInstance = null;
// fin graficas

let campaignChartInstance = null;
let spendChartInstance = null;
let ageChartInstance = null;

let ageChartType = 'bar';
let ageChartLabels = [];
let ageMaleValues = [];
let ageFemaleValues = [];

const ageChartToggle = document.getElementById('ageChartToggle');

let allCampaignRows = [];
let currentRestaurantId = null;
let currentAdAccountId = null;
let countryChartInstance = null;
let regionChartInstance = null;

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

// Graficas
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

// Graficas Edad
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
// Fin Graficas Edad

// Graficas demografía por país
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

async function loadCountryDemographics(restaurantId, adAccountId, campaignId = 'all') {
  try {
    let url = `http://localhost:3000/api/meta/demographics-country/${restaurantId}/${adAccountId}`;

    if (campaignId && campaignId !== 'all') {
      url += `?campaign_id=${encodeURIComponent(campaignId)}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (!res.ok || !result.data || result.data.length === 0) {
      availableCountries = [];
      selectedRegionCountry = null;
      populateRegionCountrySelect([]);
      renderCountryChart([], []);
      renderRegionChart([], []);
      return;
    }

    const sortedRows = [...result.data]
      .sort((a, b) => Number(b.reach || 0) - Number(a.reach || 0));

    const labels = sortedRows.map(row => row.country || 'Sin país');
    const data = sortedRows.map(row => Number(row.reach || 0));

    renderCountryChart(labels, data);

    availableCountries = [...new Set(sortedRows.map(row => row.country).filter(Boolean))];

    if (!availableCountries.includes(selectedRegionCountry)) {
      selectedRegionCountry = availableCountries[0] || null;
    }

    populateRegionCountrySelect(availableCountries);

    if (selectedRegionCountry) {
      await loadRegionDemographics(restaurantId, adAccountId, campaignId, selectedRegionCountry);
    } else {
      renderRegionChart([], []);
    }
  } catch (error) {
    console.error('Error cargando demografía por país:', error);
  }
}
// Fin Graficas demografía por país

// Graficas demografía por region
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
  }
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
// Fin Graficas demografía por region

// Graficas demografía por plataforma
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

async function loadPlatformDemographics(restaurantId, adAccountId, campaignId = 'all') {
  try {
    let url = `http://localhost:3000/api/meta/demographics-platform/${restaurantId}/${adAccountId}`;

    if (campaignId && campaignId !== 'all') {
      url += `?campaign_id=${encodeURIComponent(campaignId)}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (!res.ok || !result.data || result.data.length === 0) {
      renderPlatformChart([], []);
      return;
    }

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
  }
}
// Fin Graficas demografía por plataforma

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
      //await loadRegionDemographics(currentRestaurantId, currentAdAccountId, 'all');
    }

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
    //await loadRegionDemographics(currentRestaurantId, currentAdAccountId, selectedCampaignId);
  }
}

async function loadAdsDashboard(restaurantId) {
  try {
    const adAccountsRes = await fetch(`http://localhost:3000/api/meta/adaccounts/${restaurantId}`);
    const adAccountsResult = await adAccountsRes.json();

    if (!adAccountsRes.ok || !adAccountsResult.data || adAccountsResult.data.length === 0) {
      return;
    }

    const firstAccountId = adAccountsResult.data[0].id.replace('act_', '');
    currentRestaurantId = restaurantId;
    currentAdAccountId = firstAccountId;

    const insightsRes = await fetch(`http://localhost:3000/api/meta/insights/${restaurantId}/${firstAccountId}`);
    const insightsResult = await insightsRes.json();

    if (!insightsRes.ok || !insightsResult.data || insightsResult.data.length === 0) {
      return;
    }

    const rows = insightsResult.data;
    allCampaignRows = rows;

    populateCampaignSelect(rows);
    updateDashboardWithCampaignRows(rows);

    await loadAgeInsights(restaurantId, firstAccountId, 'all');
    await loadCountryDemographics(restaurantId, firstAccountId, 'all');
    await loadRegionDemographics(restaurantId, firstAccountId, 'all');
    await loadPlatformDemographics(restaurantId, firstAccountId, 'all');
  } catch (error) {
    console.error('Error cargando dashboard de publicidad:', error);
  }
}
// Fin Graficas

// Graficas Edad
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
      renderAgeChart(ageRanges, maleData, femaleData);
      return;
    }

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
  }
}
// Fin Graficas Edad

async function loadProfile() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Error al cargar perfil');
    }

    document.getElementById('welcome').textContent = `Bienvenido, ${result.restaurant.name}`;

    const restaurantId = result.restaurant.id;
    localStorage.setItem('restaurant_id', restaurantId);

    await loadMetaStatus(restaurantId);

    await loadAdsDashboard(restaurantId);
    setInterval(() => {
      loadAdsDashboard(restaurantId);
    }, 8 * 60 * 60 * 1000);

    if (metaConnected === 'connected') {
      setMetaStatus('status-success', 'Meta vinculada correctamente.');
    }
  } catch (error) {
    console.error(error);
    localStorage.removeItem('token');
    localStorage.removeItem('restaurant');
    localStorage.removeItem('restaurant_id');
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
        `Meta ya vinculada con: ${result.connection.meta_user_name}`
      );

      setMetaButtonState({
        disabled: true,
        text: 'Meta ya vinculada',
        styleClass: 'btn-disabled'
      });
    } else {
      setMetaStatus('status-warning', 'Meta no vinculada.');

      setMetaButtonState({
        disabled: false,
        text: 'Vincular Meta',
        styleClass: 'btn-primary'
      });
    }
  } catch (error) {
    console.error(error);

    setMetaStatus('status-error', 'No se pudo verificar el estado de Meta.');

    setMetaButtonState({
      disabled: false,
      text: 'Vincular Meta',
      styleClass: 'btn-primary'
    });
  }
}

loadProfile();

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('restaurant');
  localStorage.removeItem('restaurant_id');
  window.location.href = './login.html';
});

if (btnVincularMeta) {
  btnVincularMeta.addEventListener('click', () => {
    const restaurantId = localStorage.getItem('restaurant_id');

    if (!restaurantId) {
      setMetaStatus('status-error', 'No se encontró el restaurante logueado.');
      return;
    }

    setMetaStatus('status-info', 'Redirigiendo a Meta...');
    setMetaButtonState({
      disabled: true,
      text: 'Conectando...',
      styleClass: 'btn-disabled'
    });

    window.location.href = `http://localhost:3000/api/meta/connect?restaurant_id=${restaurantId}`;
  });
}

// Boton para cambiar grafica de edades
if (ageChartToggle) {
  ageChartToggle.addEventListener('click', () => {
    if (!ageChartLabels.length) return;

    ageChartType = ageChartType === 'bar' ? 'pie' : 'bar';
    renderAgeChart(ageChartLabels, ageMaleValues, ageFemaleValues);
  });
}
// Fin Boton para cambiar grafica de edades

// Actualizacion manual
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
// Fin actualizacion manual

if (regionCountrySelect) {
  regionCountrySelect.addEventListener('change', async (event) => {
    selectedRegionCountry = event.target.value;

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

const regionChartTitle = document.getElementById('regionChartTitle');

function updateRegionTitle(country) {
  if (!regionChartTitle) return;
  regionChartTitle.textContent = country
    ? `Alcance por región (${country})`
    : 'Alcance por región';
}