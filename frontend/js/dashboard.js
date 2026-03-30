const token = localStorage.getItem('token');

const params = new URLSearchParams(window.location.search);
const metaConnected = params.get('meta');

if (!token) {
  window.location.href = './login.html';
}

const btnVincularMeta = document.getElementById('btnVincularMeta');
const metaStatus = document.getElementById('metaStatus');

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

    if (metaConnected === 'connected' && metaStatus) {
      metaStatus.textContent = 'Meta vinculada correctamente.';
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
      if (metaStatus) {
        metaStatus.textContent = `Meta ya vinculada con: ${result.connection.meta_user_name}`;
      }

      if (btnVincularMeta) {
        btnVincularMeta.disabled = true;
        btnVincularMeta.textContent = 'Meta ya vinculada';
      }
    } else {
      if (metaStatus) {
        metaStatus.textContent = 'Meta no vinculada.';
      }

      if (btnVincularMeta) {
        btnVincularMeta.disabled = false;
        btnVincularMeta.textContent = 'Vincular Meta';
      }
    }
  } catch (error) {
    console.error(error);
    if (metaStatus) {
      metaStatus.textContent = 'No se pudo verificar el estado de Meta.';
    }
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