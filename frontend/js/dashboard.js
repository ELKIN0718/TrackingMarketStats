const token = localStorage.getItem('token');
const restaurant = JSON.parse(localStorage.getItem('restaurant'));

if (!token || !restaurant) {
  window.location.href = './login.html';
}

document.getElementById('welcome').textContent = `Bienvenido, ${restaurant.name}`;

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('restaurant');
  window.location.href = './login.html';
});
