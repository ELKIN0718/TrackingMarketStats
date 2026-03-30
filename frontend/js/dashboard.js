const token = localStorage.getItem('token');

const params = new URLSearchParams(window.location.search);
const metaConnected = params.get('meta');

if (!token) {
  window.location.href = './login.html';
}

const btnVincularMeta = document.getElementById('btnVincularMeta');
const metaStatus = document.getElementById('metaStatus');

//graficas
const kpiSpend = document.getElementById('kpiSpend');
const kpiImpressions = document.getElementById('kpiImpressions');
const kpiReach = document.getElementById('kpiReach');
const kpiClicks = document.getElementById('kpiClicks');
const refreshAdsBtn = document.getElementById('refreshAdsBtn');
//fin graficas

let campaignChartInstance = null;
let spendChartInstance = null;
let ageChartInstance = null;

let ageChartType = 'bar';
let ageChartLabels = [];
let ageMaleValues = [];
let ageFemaleValues = [];

const ageChartToggle = document.getElementById('ageChartToggle');

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

//Graficas
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

//Grafias Edad
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
//Fin Grafias Edad

async function loadAdsDashboard(restaurantId) {
  try {
    const adAccountsRes = await fetch(`http://localhost:3000/api/meta/adaccounts/${restaurantId}`);
    const adAccountsResult = await adAccountsRes.json();

    if (!adAccountsRes.ok || !adAccountsResult.data || adAccountsResult.data.length === 0) {
      return;
    }

    const firstAccountId = adAccountsResult.data[0].id.replace('act_', '');

    const insightsRes = await fetch(`http://localhost:3000/api/meta/insights/${restaurantId}/${firstAccountId}`);
    const insightsResult = await insightsRes.json();

    if (!insightsRes.ok || !insightsResult.data || insightsResult.data.length === 0) {
      return;
    }

    const rows = insightsResult.data;

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
    await loadAgeInsights(restaurantId, firstAccountId);

  } catch (error) {
    console.error('Error cargando dashboard de publicidad:', error);
  }
}
//Fin Graficas

//Graficas Edad
async function loadAgeInsights(restaurantId, adAccountId) {
  try {
    const res = await fetch(`http://localhost:3000/api/meta/insights-age/${restaurantId}/${adAccountId}`);
    const result = await res.json();

    if (!res.ok || !result.data || result.data.length === 0) {
      return;
    }

    const ageRanges = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const maleData = new Array(ageRanges.length).fill(0);
    const femaleData = new Array(ageRanges.length).fill(0);

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
//Fin Graficas Edad


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

    //Graficas
    await loadAdsDashboard(restaurantId);
    setInterval(() => {
      loadAdsDashboard(restaurantId);
    }, 8 * 60 * 60 * 1000);
    //Fin Graficas

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
//Boton para cambiar grafica de edades 
if (ageChartToggle) {
  ageChartToggle.addEventListener('click', () => {
    if (!ageChartLabels.length) return;

    ageChartType = ageChartType === 'bar' ? 'pie' : 'bar';
    renderAgeChart(ageChartLabels, ageMaleValues, ageFemaleValues);
  });
}
//Fin Boton para cambiar grafica de edades 

//Actualizcion manual
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
//Fin actualizcion manual