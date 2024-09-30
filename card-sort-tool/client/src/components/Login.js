import React, { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  width: 300px;
`;

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/users/login', { username, password });
      onLogin(response.data.token);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <LoginContainer>
      <h2>Login</h2>
      <LoginForm onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </LoginForm>
    </LoginContainer>
  );
}

export default Login;