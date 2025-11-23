import React, { useState, useEffect } from 'react';
import './ConstructionHistory.css';

function ConstructionHistory({ projectName, onBack }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [summary, setSummary] = useState(null); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [aiProcessedImage, setAiProcessedImage] = useState(null);
  const [progressData, setProgressData] = useState(null);

  const [showBimOverlay, setShowBimOverlay] = useState(false);
  const [bimPlanImage, setBimPlanImage] = useState(null);
  const [isLoadingBimPlan, setIsLoadingBimPlan] = useState(false);

  // NOVO ESTADO: Modal de zoom
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Buscar imagens e progresso
  useEffect(() => {
    
    // Função para buscar as imagens da pasta
    const fetchImages = async () => {
      try {
        const res = await fetch(`/folder/${projectName}`);
        const data = await res.json();

        if (data.length > 0) {
          setImages(data.map((img, i) => ({
            id: img.id,
            url: img.base64,
            date: img.criado_em,
            description: img.descricao || 'Sem descrição',
            progress_snapshot: img.progress_snapshot 
          })));

          setSummary({
            totalArea: '15.000 m²',
            startDate: data[0].criado_em,
            expectedCompletion: '2025-12-31',
            responsible: 'Eng. Responsável',
            status: 'Em andamento'
          });
        }
      } catch (err) {
        console.error('Erro ao buscar imagens:', err);
      }
    };

    // Função para buscar o progresso REAL da API
    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/progress/${projectName}`);
        if (!res.ok) {
            if(res.status === 404) {
              console.warn(`Plano base para '${projectName}' não encontrado.`);
              setProgressData(null);
              return;
            }
            throw new Error('Falha ao buscar progresso');
        }
        const data = await res.json();
        setProgressData(data); 
      } catch (err) {
        console.error('Erro ao buscar progresso:', err);
      }
    };

    // Função para buscar a imagem do plano BIM 100%
    const fetchPlanImage = async () => {
        if (!projectName) return;
        setIsLoadingBimPlan(true);
        try {
            const res = await fetch(`/api/plan-image/${projectName}`);
            if (res.ok) {
                setBimPlanImage(res.url); 
            } else {
                console.warn(`Imagem do plano (100%) para '${projectName}' não encontrada.`);
                setBimPlanImage(null);
            }
        } catch (err) {
            console.error('Erro ao buscar imagem do plano:', err);
            setBimPlanImage(null);
        } finally {
            setIsLoadingBimPlan(false);
        }
    };

    fetchImages();
    fetchProgress(); 
    fetchPlanImage();
    
  }, [projectName]); 

  // Determina se são poucas ou muitas imagens
  const hasFewImages = images.length <= 4;
  const timelineClass = `timeline-scroll ${hasFewImages ? 'few-images' : 'many-images'}`;

  const handleNext = () =>
    setCurrentImageIndex(prev =>
      prev === images.length - 1 ? 0 : prev + 1
    );

  const handlePrev = () =>
    setCurrentImageIndex(prev =>
      prev === 0 ? images.length - 1 : prev - 1
    );

  // NOVAS FUNÇÕES: Zoom
  const handleZoomImage = (image) => {
    setZoomedImage(image);
    setShowZoomModal(true);
  };

  const handleCloseZoom = () => {
    setShowZoomModal(false);
    setZoomedImage(null);
  };

  const handleZoomNext = () => {
    const nextIndex = (currentImageIndex + 1) % images.length;
    setCurrentImageIndex(nextIndex);
    setZoomedImage(images[nextIndex]);
  };

  const handleZoomPrev = () => {
    const prevIndex = (currentImageIndex - 1 + images.length) % images.length;
    setCurrentImageIndex(prevIndex);
    setZoomedImage(images[prevIndex]);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };
 
  // Função de upload
  const handleUpload = async () => {
    if (!selectedFile) return;
 
    const toBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
 
    const imageBase64 = await toBase64(selectedFile);
 
    const payload = {
      nomeObra: projectName,
      folder: projectName, 
      pontoDeVista: 'Frontal',
      descricao: selectedFile.name,
      gps: { latitude: 0, longitude: 0 },
      orientacao: { azimute_graus: 0, pitch_graus: 0, roll_graus: 0 },
      imageBase64
    };
 
    try {
      const res = await fetch('/api/captures/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Imagem enviada com sucesso!');
        setSelectedFile(null);
 
        // Recarrega as imagens
        const updated = await fetch(`/folder/${projectName}`);
        const imagesData = await updated.json();
        
        if (imagesData.length > 0) {
           setImages(imagesData.map((img, i) => ({
             id: img.id,
             url: img.base64,
             date: img.criado_em,
             description: img.descricao || 'Sem descrição',
             progress_snapshot: img.progress_snapshot
           })));
          
           setSummary({
             totalArea: '15.000 m²',
             startDate: imagesData[0].criado_em,
             expectedCompletion: '2025-12-31',
             responsible: 'Eng. Responsável',
             status: 'Em andamento'
           });
        }
        
      } else {
        alert('Erro: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar a imagem.');
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch(`/api/export-report/${projectName}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `relatorio-${projectName}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Erro ao exportar relatório');
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('Erro ao exportar relatório');
    }
  };

  // Função handleApplyAI
  const handleApplyAI = async () => {
    if (!currentImage) return;
    
    setIsApplyingAI(true);
    try {
      const response = await fetch(`/inference/${currentImage.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json(); 

        if(result.error) {
            alert(`Aviso: ${result.error}`);
        } else {
            setProgressData(result);
            console.log("Progresso atualizado:", result);
            
            setImages(prevImages => prevImages.map(img => 
                img.id === currentImage.id 
                ? { ...img, progress_snapshot: result.porcentagem_imagem } 
                : img
            ));
        }
        
        const processedImageData = {
          url: result.overlay, 
          date: new Date().toISOString(),
          description: `Análise IA: ${currentImage.description}`,
        };
        
        setAiProcessedImage(processedImageData);
        setShowComparison(true);
      } else {
        alert('Erro na análise de IA');
      }
    } catch (error) {
      console.error('Erro ao aplicar IA:', error);
      alert('Erro ao aplicar IA');
    } finally {
      setIsApplyingAI(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('pt-BR');

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#00b894';
    if (progress >= 50) return '#fdcb6e';
    return '#e17055';
  };

  const currentImage = images[currentImageIndex];
  const realProgress = progressData ? progressData.porcentagem_geral : 0;

  // Bloco 'sem imagem'
  if (!currentImage) {
    return (
      <div className="history-container">
        <header className="history-header">
          <button className="back-button" onClick={onBack}>← Voltar</button>
          <h1 className="project-title">{projectName}</h1>
        </header>
        <p className="text-center mt-8">Nenhuma imagem encontrada.</p>
        
        <div className="summary-section">
            <div className="upload-section" style={{ margin: '0 auto', maxWidth: '400px' }}>
              <h3>Adicionar nova imagem</h3>
              <div className="upload-area">
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <label htmlFor="file-input" className="upload-button">
                  📷 Selecionar imagem
                </label>
                {selectedFile && (
                  <div className="selected-file">
                    <span>{selectedFile.name}</span>
                    <button onClick={handleUpload} className="confirm-upload">
                      📤 Enviar
                    </button>
                  </div>
                )}
              </div>
              <p className="upload-hint">
                Formatos: JPG, PNG (Máx: 10MB)
              </p>
            </div>
        </div>
        
      </div>
    );
  }

  // Bloco principal 'com imagens'
  return (
    <div className="history-container">
      <header className="history-header">
        <button className="back-button" onClick={onBack}>
          ← Voltar
        </button>
        <h1 className="project-title">{projectName}</h1>
        <div className="header-actions">
          <button className="export-report-btn" onClick={handleExportReport}>
            📊 Exportar relatório BIM
          </button>
          <span className="progress-badge">
            Progresso: {realProgress}%
          </span>
        </div>
      </header>

      <div className="history-content">
        <div className="image-section">
          <div className={`image-container ${showComparison ? 'comparison-mode' : ''}`}>
            
            <div className={`image-wrapper`}>
              <img
                src={currentImage.url}
                alt={`Obra ${formatDate(currentImage.date)}`}
                className="construction-image"
              />

              {showBimOverlay && bimPlanImage && (
                <img
                  src={bimPlanImage}
                  alt="Overlay do Plano BIM"
                  className="bim-overlay-image" 
                />
              )}

              {!showComparison && (
                <>
                  <button className="nav-button prev-button" onClick={handlePrev}>‹</button>
                  <button className="nav-button next-button" onClick={handleNext}>›</button>
                  
                  <button 
                    className="zoom-button"
                    onClick={() => handleZoomImage(currentImage)}
                    title="Ampliar imagem"
                  >
                    🔍
                  </button>
                </>
              )}
              <div className="image-label">Original</div>
            </div>

            {showComparison && aiProcessedImage && (
              <div className="image-wrapper">
                <img
                  src={aiProcessedImage.url || '/api/placeholder/800/600'} 
                  alt={`Processado por IA ${formatDate(currentImage.date)}`}
                  className="construction-image"
                />
                
                <button 
                  className="zoom-button"
                  onClick={() => handleZoomImage({
                    url: aiProcessedImage.url,
                    date: aiProcessedImage.date,
                    description: aiProcessedImage.description
                  })}
                  title="Ampliar imagem"
                >
                  🔍
                </button>

                <div className="image-label">Análise IA</div>
              </div>
            )}

            <div className="image-overlay">
              <div className="image-info">
                <h3>{formatDate(currentImage.date)}</h3>
                <p>{currentImage.description}</p>
                <div className="progress-indicator">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${realProgress}%`,
                      backgroundColor: getProgressColor(realProgress)
                    }}
                  ></div>
                  <span>{realProgress}% concluído</span>
                  <button 
                    className={`ai-analysis-btn ${showComparison ? 'comparison-active' : ''}`}
                    onClick={handleApplyAI}
                    disabled={isApplyingAI}
                  >
                    {isApplyingAI ? '🔄 Aplicando IA...' : 
                      showComparison ? '🔄 Nova Análise' : '🤖 Aplicar IA'}
                  </button>

                  {/* Botão de Toggle do Overlay BIM */}
                  {bimPlanImage && (
                    <button 
                      className={`bim-overlay-btn ${showBimOverlay ? 'comparison-active' : ''}`}
                      onClick={() => setShowBimOverlay(!showBimOverlay)}
                      title="Sobrepor plano BIM"
                    >
                      BIM
                    </button>
                  )}

                  {showComparison && (
                    <button 
                      className="close-comparison-btn"
                      onClick={() => setShowComparison(false)}
                    >
                      ✕ Voltar para vista única
                    </button> 
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="timeline-section">
            <h3>Linha do tempo da obra</h3>
            <div className={timelineClass}>
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className={`timeline-item ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img src={image.url} alt={`Thumb ${formatDate(image.date)}`} className="timeline-thumb" />
                  <div className="timeline-date">{formatDate(image.date)}</div>
                  <div className="timeline-progress">{image.progress_snapshot}%</div>
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

            <div className="upload-section">
              <h3>Adicionar nova imagem</h3>
              <div className="upload-area">
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <label htmlFor="file-input" className="upload-button">
                  📷 Selecionar imagem
                </label>

                {selectedFile && (
                  <div className="selected-file">
                    <span>{selectedFile.name}</span>
                    <button onClick={handleUpload} className="confirm-upload">
                      📤 Enviar
                    </button>
                  </div>
                )}
              </div>
              <p className="upload-hint">
                Formatos: JPG, PNG (Máx: 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {showZoomModal && zoomedImage && (
        <div className="zoom-modal-overlay" onClick={handleCloseZoom}>
          <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="zoom-modal-header">
              <h3>{formatDate(zoomedImage.date)}</h3>
              <button className="zoom-close-btn" onClick={handleCloseZoom}>
                ✕
              </button>
            </div>
            
            <div className="zoom-image-container">
              <img
                src={zoomedImage.url}
                alt={`Zoom ${formatDate(zoomedImage.date)}`}
                className="zoom-image"
              />
              
              <button className="zoom-nav-button zoom-prev" onClick={handleZoomPrev}>
                ‹
              </button>
              <button className="zoom-nav-button zoom-next" onClick={handleZoomNext}>
                ›
              </button>
            </div>
            
            <div className="zoom-modal-footer">
              <p>{zoomedImage.description}</p>
              <div className="zoom-actions">
                <span className="zoom-counter">
                  {currentImageIndex + 1} / {images.length}
                </span>
                <button className="zoom-download-btn" onClick={() => {
                  const link = document.createElement('a');
                  link.href = zoomedImage.url;
                  link.download = `imagem-${formatDate(zoomedImage.date)}.jpg`;
                  link.click();
                }}>
                  📥 Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConstructionHistory;