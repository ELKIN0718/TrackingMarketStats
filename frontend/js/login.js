document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };

  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  document.getElementById('message').textContent = result.message;

  if (res.ok && result.token) {
    localStorage.setItem('token', result.token);
    localStorage.setItem('restaurant', JSON.stringify(result.restaurant));
    localStorage.setItem('restaurant_id', result.restaurant.id);
    localStorage.setItem('restaurant_name', result.restaurant.name);

    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 1000);
  }
});
