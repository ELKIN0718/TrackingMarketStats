document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };

  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  document.getElementById('message').textContent = result.message;

  if (res.ok) {
    setTimeout(() => {
      window.location.href = './login.html';
    }, 1000);
  }
});
