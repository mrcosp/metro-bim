import React, { useState, useEffect } from 'react';
import './ConstructionHistory.css';

function ConstructionHistory({ projectName, onBack }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Buscar imagens do backend
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(`http://localhost:3000/folder/${projectName}`);
        const data = await res.json();

        if (data.length > 0) {
          setImages(data.map((img, i) => ({
            id: img.id,
            url: img.base64,
            date: img.criado_em,
            description: img.descricao || 'Sem descrição',
            progress: Math.min(100, 10 + i * 20)
          })));

          // sumário (exemplo: pega as datas e calcula progresso)
          setSummary({
            totalArea: '15.000 m²',
            startDate: data[0].criado_em,
            expectedCompletion: '2025-12-31',
            currentProgress: Math.min(100, data.length * 15),
            responsible: 'Eng. Responsável',
            status: 'Em andamento'
          });
        }
      } catch (err) {
        console.error('Erro ao buscar imagens:', err);
      }
    };
    fetchImages();
  }, [projectName]);

  const handleNext = () =>
    setCurrentImageIndex(prev =>
      prev === images.length - 1 ? 0 : prev + 1
    );

  const handlePrev = () =>
    setCurrentImageIndex(prev =>
      prev === 0 ? images.length - 1 : prev - 1
    );

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('pt-BR');

  const getProgressColor = (progress) => {
    if (progress < 30) return '#ff4444';
    if (progress < 60) return '#ffaa00';
    if (progress < 90) return '#00aaff';
    return '#00cc66';
  };

  const currentImage = images[currentImageIndex];

  if (!currentImage) {
    return (
      <div className="history-container">
        <header className="history-header">
          <button className="back-button" onClick={onBack}>← Voltar</button>
          <h1 className="project-title">{projectName}</h1>
        </header>
        <p className="text-center mt-8">Nenhuma imagem encontrada.</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      <header className="history-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>
        <h1 className="project-title">{projectName}</h1>
        <div className="header-actions">
          <span className="progress-badge">
            Progresso: {summary?.currentProgress || 0}%
          </span>
        </div>
      </header>

      <div className="history-content">
        <div className="image-section">
          <div className="image-container">
            <img
              src={currentImage.url}
              alt={`Obra ${formatDate(currentImage.date)}`}
              className="construction-image"
            />
            <button className="nav-button prev-button" onClick={handlePrev}>‹</button>
            <button className="nav-button next-button" onClick={handleNext}>›</button>

            <div className="image-overlay">
              <div className="image-info">
                <h3>{formatDate(currentImage.date)}</h3>
                <p>{currentImage.description}</p>
                <div className="progress-indicator">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${currentImage.progress}%`,
                      backgroundColor: getProgressColor(currentImage.progress)
                    }}
                  ></div>
                  <span>{currentImage.progress}% concluído</span>
                </div>
              </div>
            </div>
          </div>

          <div className="timeline-section">
            <h3>Linha do tempo da obra</h3>
            <div className="timeline-scroll">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className={`timeline-item ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img src={image.url} alt={`Thumb ${formatDate(image.date)}`} className="timeline-thumb" />
                  <div className="timeline-date">{formatDate(image.date)}</div>
                  <div className="timeline-progress">{image.progress}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {summary && (
          <div className="summary-section">
            <div className="summary-card">
              <h2>Sumário da obra</h2>
              <div className="summary-item">
                <label>Área total:</label>
                <span>{summary.totalArea}</span>
              </div>
              <div className="summary-item">
                <label>Data início:</label>
                <span>{formatDate(summary.startDate)}</span>
              </div>
              <div className="summary-item">
                <label>Previsão término:</label>
                <span>{formatDate(summary.expectedCompletion)}</span>
              </div>
              <div className="summary-item">
                <label>Responsável:</label>
                <span>{summary.responsible}</span>
              </div>
              <div className="summary-item">
                <label>Status:</label>
                <span className={`status-badge ${summary.status.toLowerCase().replace(' ', '-')}`}>
                  {summary.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConstructionHistory;
