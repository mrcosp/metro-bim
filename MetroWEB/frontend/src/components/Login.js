import React, { useState,  useEffect } from 'react';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');


  const handleCpfChange = (e) => {
    const numbers = e.target.value.replace(/\D/g, '');
    let formatted = numbers;
    if (numbers.length > 3) formatted = `${numbers.slice(0,3)}.${numbers.slice(3)}`;
    if (numbers.length > 6) formatted = `${numbers.slice(0,3)}.${numbers.slice(3,6)}.${numbers.slice(6)}`;
    if (numbers.length > 9) formatted = `${numbers.slice(0,3)}.${numbers.slice(3,6)}.${numbers.slice(6,9)}-${numbers.slice(9,11)}`;
    setCpf(formatted);
  };

    useEffect(() => {
        document.title = "Metrô SP - Login";
      }, []);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !cpf) return;
    setError('');

    try {
      const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cpf: cpf.replace(/\D/g, '') })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `Erro ${res.status}`);
        return;
      }

      const data = await res.json();
      if (!data.ok || !data.email) {
        setError('Resposta inválida do servidor');
        return;
      }

      onLogin(data); 
    } catch (err) {
      setError('Não foi possível conectar ao servidor');
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <div className="animated-background">
        <div className="shape shape1"></div>
        <div className="shape shape2"></div>
        <div className="shape shape3"></div>
        <div className="shape shape4"></div>
      </div>

      <div className="login-box">
        <div className="logo-placeholder">
          <div className="metro-logo">
            <span className="metro-text">METRÔ</span>
            <span className="bim-text"></span>
          </div>
          <p className="logo-subtitle">Análise de obras</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="login-title">Acesso ao sistema</h2>

          <div className="input-group">
            <label htmlFor="email" className="input-label">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="login-input"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="cpf" className="input-label">CPF</label>
            <div className="password-container">
              <input
                id="cpf"
                type={showPassword ? "text" : "password"}
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="login-input password-input"
                maxLength="14"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
