import React, { useState } from 'react';
import './UsersManagement.css';

function UsersManagement({ onBack }) {
  const [users, setUsers] = useState([
    
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    active: true
  });

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const printDate = new Date().toLocaleDateString('pt-BR');
    const printTime = new Date().toLocaleTimeString('pt-BR');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de usuários - Metrô SP</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 40px; 
            color: #333;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 3px solid #001871;
            padding-bottom: 20px;
          }
          .title { 
            color: #001871; 
            font-size: 28px; 
            margin: 0 0 10px 0;
            font-weight: bold;
          }
          .subtitle { 
            color: #666; 
            font-size: 16px;
            margin: 5px 0;
          }
          .date { 
            color: #888; 
            font-size: 14px;
            margin: 5px 0;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          th { 
            background-color: #001871; 
            color: white; 
            padding: 15px 12px; 
            text-align: left;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td { 
            padding: 12px; 
            border-bottom: 1px solid #e1e5e9;
            font-size: 14px;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          tr:hover {
            background-color: #f0f4ff;
          }
          .status-active { 
            color: #2e7d32; 
            font-weight: bold;
            background-color: #e8f5e8;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            display: inline-block;
          }
          .status-inactive { 
            color: #c62828; 
            font-weight: bold;
            background-color: #ffebee;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            display: inline-block;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          .total-users {
            margin-top: 20px;
            padding: 10px;
            background-color: #f0f4ff;
            border-radius: 8px;
            font-weight: bold;
            color: #001871;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
            table { box-shadow: none; }
          }
          @media (max-width: 768px) {
            body { margin: 20px; }
            table { font-size: 12px; }
            th, td { padding: 8px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Relatório de usuários</h1>
          <div class="subtitle">Metro de SP - Gestão de usuários</div>
          <div class="date">Gerado em: ${printDate} às ${printTime}</div>
        </div>
        
        <div class="total-users">
          Total de usuários: ${users.length} | Ativos: ${users.filter(u => u.active).length} | Inativos: ${users.filter(u => !u.active).length}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cargo</th>
              <th>E-mail</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td><strong>${user.name}</strong></td>
                <td>${user.role}</td>
                <td style="font-family: monospace;">${user.email}</td>
                <td>
                  <span class="${user.active ? 'status-active' : 'status-inactive'}">
                    ${user.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Relatório gerado automaticamente pelo Sistema Metro SP</p>
          <p>© ${new Date().getFullYear()} Metro de SP - Todos os direitos reservados</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;" class="no-print">
          <button onclick="window.print()" style="
            background: #001871;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-right: 10px;
          ">🖨️ Imprimir</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
    }, 500);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      role: '',
      email: '',
      active: true
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      role: user.role,
      email: user.email,
      active: user.active
    });
    setShowModal(true);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleSaveUser = () => {
    if (!formData.name || !formData.role || !formData.email) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (editingUser) {
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...formData }
          : user
      ));
    } else {
      const newUser = {
        id: Math.max(...users.map(u => u.id)) + 1,
        ...formData
      };
      setUsers([...users, newUser]);
    }

    setShowModal(false);
    setFormData({
      name: '',
      role: '',
      email: '',
      active: true
    });
  };

  const toggleUserStatus = (userId) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, active: !user.active }
        : user
    ));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="users-container">
      <header className="users-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>
        <h1 className="users-title">Gerenciamento de usuários</h1>
        <div className="header-actions">
          <button className="export-pdf-btn" onClick={exportToPDF}>
            📄 Exportar relatório de usuários
          </button>
          <button className="new-user-btn" onClick={handleNewUser}>
            + Cadastrar novo usuário
          </button>
        </div>
      </header>

      <main className="users-main">
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
           <tbody>
              {users.map(user => (
                <tr key={user.id} className={user.active ? '' : 'inactive'}>
                  <td className="user-name">{user.name}</td>
                  <td className="user-role">{user.role}</td>
                  <td className="user-email">{user.email}</td>
                  <td className="user-status">
                    <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <button 
                      className="toggle-status-btn"
                      onClick={() => toggleUserStatus(user.id)}
                      title={user.active ? 'Desativar usuário' : 'Ativar usuário'}
                    >
                      {user.active ? '⏸️' : '▶️'}
                    </button>
                  </td>
                  <td className="user-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditUser(user)}
                      title="Editar usuário"
                    >
                      ✏️
                    </button>
                    
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="no-users">
              <p>Nenhum usuário cadastrado</p>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingUser ? 'Editar usuário' : 'Cadastrar novo usuário'}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Nome *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Digite o nome completo"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="role">Cargo *</label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="Digite o cargo"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">E-mail *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Digite o e-mail"
                    className="form-input"
                  />
                </div>

               <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      className="checkbox-input"
                    />
                    <span className="checkmark"></span>
                  </label>
                                      Usuário ativo

                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn cancel1"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn confirm1"
                onClick={handleSaveUser}
              >
                {editingUser ? 'Salvar alterações' : 'Cadastrar usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManagement;