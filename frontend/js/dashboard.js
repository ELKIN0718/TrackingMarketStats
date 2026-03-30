const token = localStorage.getItem('token');

const params = new URLSearchParams(window.location.search);
const metaConnected = params.get('meta');

if (metaConnected === 'connected') {
  const metaStatus = document.getElementById('metaStatus');
  if (metaStatus) {
    metaStatus.textContent = 'Meta vinculada correctamente.';
  }
}

if (!token) {
  window.location.href = './login.html';
}

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
  } catch (error) {
    console.error(error);
    localStorage.removeItem('token');
    localStorage.removeItem('restaurant');
    window.location.href = './login.html';
  }
}

loadProfile();

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('restaurant');
  window.location.href = './login.html';
});

const btnVincularMeta = document.getElementById('btnVincularMeta');
const metaStatus = document.getElementById('metaStatus');

if (btnVincularMeta) {
  btnVincularMeta.addEventListener('click', () => {
    const restaurantId = localStorage.getItem('restaurant_id');

    if (!restaurantId) {
      if (metaStatus) {
        metaStatus.textContent = 'No se encontró el restaurante logueado.';
      }
      return;
    }

    if (metaStatus) {
      metaStatus.textContent = 'Redirigiendo a Meta...';
    }

    window.location.href = `http://localhost:3000/api/meta/connect?restaurant_id=${restaurantId}`;
  });
}