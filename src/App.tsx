import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

interface Midia {
  tipo: 'foto' | 'video';
  url: string;
}
interface Veiculo {
  id: number;
  marca: string;
  modelo: string;
  fabricacao: string;
  km: string;
  preco: string;
  status: 'Disponível' | 'Vendido' | 'Oculto';
  galeria: Midia[];
  unico_dono: boolean;
  cliente_nome?: string;
  depoimento_venda?: string;
  blindado?: boolean;
  laudo_cautelar?: boolean;
  ipva_pago?: boolean;
  preco_antigo?: string;
  em_promocao?: boolean;
}
interface Avaliacao {
  id: number;
  nome: string;
  texto: string;
  foto_url: string;
  aprovado: boolean;
}
interface VideoGaleria {
  id: number;
  url: string;
}

const TODAS_AS_MARCAS = [
  'Audi',
  'BMW',
  'BYD',
  'Caoa Chery',
  'Chevrolet',
  'Citroën',
  'Fiat',
  'Ford',
  'GWM',
  'Honda',
  'Hyundai',
  'Jeep',
  'Kia',
  'Land Rover',
  'Mercedes-Benz',
  'Mitsubishi',
  'Nissan',
  'Peugeot',
  'Porsche',
  'Renault',
  'Suzuki',
  'Toyota',
  'Volkswagen',
  'Volvo',
].sort();
const ANOS_OPCOES = [
  '2026',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
  '2017',
  '2016',
  '2015',
  '2014',
  '2013',
];

// --- FUNÇÃO PARA FORMATAR MOEDA AUTOMATICAMENTE (R$ 76.000,00) ---
const formatCurrencyBR = (value: string) => {
  let v = value.replace(/\D/g, ''); // Remove tudo que não é número
  if (!v) return '';
  v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ','); // Coloca vírgula nos centavos
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Coloca ponto nos milhares
  return v;
};

export default function App() {
  const [view, setView] = useState<'public' | 'admin'>('public');
  const [adminTab, setAdminTab] = useState<
    | 'inicio'
    | 'avaliacoes'
    | 'videos'
    | 'institucional'
    | 'novo_veiculo'
    | 'meu_estoque'
  >('inicio');
  const [loading, setLoading] = useState(false);

  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [videosGaleria, setVideosGaleria] = useState<VideoGaleria[]>([]);
  const [config, setConfig] = useState<any>({
    hero_title: 'Seu próximo carro está aqui.',
    whatsapp: '5585999999999',
    vendas_contador: 180,
  });

  const [buscaTermo, setBuscaTermo] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroPreco, setFiltroPreco] = useState('');
  const [filtroKm, setFiltroKm] = useState('');
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [pubReview, setPubReview] = useState({ nome: '', texto: '' });
  const [pubReviewFile, setPubReviewFile] = useState<File | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchVeiculos();
    fetchAvaliacoes();
    fetchVideos();
  }, []);

  async function fetchConfig() {
    const { data } = await supabase
      .from('site_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (data) setConfig(data);
  }
  async function fetchVeiculos() {
    const { data } = await supabase
      .from('veiculos')
      .select('*')
      .order('id', { ascending: false });
    if (data) setVeiculos(data);
  }
  async function fetchAvaliacoes() {
    const { data } = await supabase
      .from('avaliacoes')
      .select('*')
      .order('id', { ascending: false });
    if (data) setAvaliacoes(data);
  }
  async function fetchVideos() {
    const { data } = await supabase
      .from('galeria_videos')
      .select('*')
      .order('id', { ascending: false });
    if (data) setVideosGaleria(data);
  }

  const sanitizeNumber = (str: string) => Number(str.replace(/\D/g, ''));

  const veiculosFiltrados = veiculos.filter((v) => {
    if (v.status !== 'Disponível') return false;
    const matchBusca =
      v.modelo.toLowerCase().includes(buscaTermo.toLowerCase()) ||
      v.marca.toLowerCase().includes(buscaTermo.toLowerCase());
    const matchMarca = filtroMarca === '' || v.marca === filtroMarca;
    const matchAno = filtroAno === '' || v.fabricacao === filtroAno;

    const kmNum = sanitizeNumber(v.km);
    let matchKm = true;
    if (filtroKm === 'ate-30k') matchKm = kmNum <= 30000;
    else if (filtroKm === '30k-60k') matchKm = kmNum > 30000 && kmNum <= 60000;
    else if (filtroKm === 'acima-60k') matchKm = kmNum > 60000;

    const precoNum = sanitizeNumber(v.preco);
    let matchPreco = true;
    if (filtroPreco === 'ate-60k') matchPreco = precoNum <= 6000000; // 60k
    else if (filtroPreco === '60k-100k')
      matchPreco = precoNum > 6000000 && precoNum <= 10000000;
    else if (filtroPreco === '100k-150k')
      matchPreco = precoNum > 10000000 && precoNum <= 15000000;
    else if (filtroPreco === 'acima-150k') matchPreco = precoNum > 15000000;

    return matchBusca && matchMarca && matchAno && matchKm && matchPreco;
  });

  const handleInteresse = (v: Veiculo) => {
    const msg = encodeURIComponent(
      `Olá! Tenho interesse no ${v.marca} ${v.modelo} (${v.fabricacao}) que vi no site.`
    );
    window.open(`https://wa.me/${config.whatsapp}?text=${msg}`, '_blank');
  };

  async function uploadMidiaSingle(file: File) {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const { data, error } = await supabase.storage
      .from('veiculos-media')
      .upload(fileName, file);
    if (!error && data)
      return supabase.storage.from('veiculos-media').getPublicUrl(fileName).data
        .publicUrl;
    return null;
  }

  // --- BOTÕES DO GERENCIADOR DE ESTOQUE ---
  const atualizarStatusVeiculo = async (id: number, novoStatus: string) => {
    await supabase.from('veiculos').update({ status: novoStatus }).eq('id', id);
    fetchVeiculos();
  };
  const deletarVeiculo = async (id: number) => {
    if (
      window.confirm(
        'Tem certeza que deseja excluir este veículo permanentemente do site?'
      )
    ) {
      await supabase.from('veiculos').delete().eq('id', id);
      fetchVeiculos();
    }
  };
  // NOVO: Função do botão Dar Promoção
  const togglePromocao = async (id: number, statusAtual: boolean) => {
    await supabase
      .from('veiculos')
      .update({ em_promocao: !statusAtual })
      .eq('id', id);
    fetchVeiculos();
  };

  // --- AVALIAÇÕES ---
  const enviarAvaliacao = async (e: React.FormEvent, isAdmin: boolean) => {
    e.preventDefault();
    setLoading(true);
    let foto_url = '';
    if (pubReviewFile) {
      const url = await uploadMidiaSingle(pubReviewFile);
      if (url) foto_url = url;
    }
    await supabase
      .from('avaliacoes')
      .insert([
        {
          nome: pubReview.nome,
          texto: pubReview.texto,
          foto_url,
          aprovado: isAdmin,
        },
      ]);
    alert(isAdmin ? 'Avaliação publicada!' : 'Enviada! Aguarde aprovação.');
    setPubReview({ nome: '', texto: '' });
    setPubReviewFile(null);
    setShowReviewForm(false);
    fetchAvaliacoes();
    setLoading(false);
  };
  const aprovarAvaliacao = async (id: number) => {
    await supabase.from('avaliacoes').update({ aprovado: true }).eq('id', id);
    fetchAvaliacoes();
  };
  const deletarAvaliacao = async (id: number) => {
    if (window.confirm('Apagar avaliação?')) {
      await supabase.from('avaliacoes').delete().eq('id', id);
      fetchAvaliacoes();
    }
  };

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const adicionarVideoGaleria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;
    setLoading(true);
    const url = await uploadMidiaSingle(videoFile);
    if (url) {
      await supabase.from('galeria_videos').insert([{ url }]);
      alert('Vídeo adicionado!');
      setVideoFile(null);
      fetchVideos();
    }
    setLoading(false);
  };
  const deletarVideo = async (id: number) => {
    if (window.confirm('Apagar vídeo?')) {
      await supabase.from('galeria_videos').delete().eq('id', id);
      fetchVideos();
    }
  };

  // --- FORMULÁRIO DO VEÍCULO ---
  const [form, setForm] = useState<any>({
    marca: '',
    modelo: '',
    fabricacao: '',
    km: '',
    preco: '',
    preco_antigo: '',
    status: 'Disponível',
    unico_dono: false,
    blindado: false,
    laudo_cautelar: false,
    ipva_pago: false,
    cliente_nome: '',
    depoimento_venda: '',
    em_promocao: false,
  });
  const [arquivos, setArquivos] = useState<File[]>([]);

  // Máscaras de input dinâmicas
  const handlePrecoChange = (val: string, field: 'preco' | 'preco_antigo') => {
    setForm({ ...form, [field]: formatCurrencyBR(val) });
  };

  const salvarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (arquivos.length === 0) {
      alert('Selecione pelo menos uma foto!');
      return;
    }
    setLoading(true);
    const galeria: Midia[] = [];
    for (const file of arquivos) {
      const url = await uploadMidiaSingle(file);
      if (url)
        galeria.push({
          tipo: file.type.startsWith('video/') ? 'video' : 'foto',
          url,
        });
    }
    if (galeria.length > 0) {
      await supabase.from('veiculos').insert([{ ...form, galeria }]);
      alert('✅ Veículo publicado com sucesso!');
      setForm({
        marca: '',
        modelo: '',
        fabricacao: '',
        km: '',
        preco: '',
        preco_antigo: '',
        status: 'Disponível',
        unico_dono: false,
        blindado: false,
        laudo_cautelar: false,
        ipva_pago: false,
        cliente_nome: '',
        depoimento_venda: '',
        em_promocao: false,
      });
      setArquivos([]);
      fetchVeiculos();
    }
    setLoading(false);
  };

  const salvarConfig = async () => {
    setLoading(true);
    const {
      id,
      updated_at,
      brand_name,
      brand_sub,
      endereco,
      historia,
      ...configToSave
    } = config;
    await supabase.from('site_config').update(configToSave).eq('id', 1);
    alert('Alterações salvas!');
    setLoading(false);
  };

  const HeaderLogo = () => (
    <div className="brand-zone">
      <img
        src="https://i.imgur.com/eczLsJ5.png"
        alt="Logo Resplande"
        className="brand-logo-img"
      />
      <div className="brand-text-container">
        <h1 className="brand-name">
          RESPLANDE<span className="brand-sub">VEÍCULOS</span>
        </h1>
      </div>
    </div>
  );

  const institucionais = [
    { id: 1, titulo: config.secao_1_titulo, texto: config.secao_1_texto },
    { id: 2, titulo: config.secao_2_titulo, texto: config.secao_2_texto },
    { id: 3, titulo: config.secao_3_titulo, texto: config.secao_3_texto },
    { id: 4, titulo: config.secao_4_titulo, texto: config.secao_4_texto },
  ].filter((item) => item.titulo);

  // ================= VIEW PÚBLICA =================
  if (view === 'public') {
    return (
      <div className="app-public">
        <header className="header-main">
          <HeaderLogo />
          <button className="btn-admin-access" onClick={() => setView('admin')}>
            ⚙️ Admin
          </button>
        </header>
        <main className="content-main">
          <section className="hero-section">
            <h2>{config.hero_title}</h2>
          </section>

          <section className="filter-panel-refined">
            <input
              className="search-input-sleek"
              placeholder="Digite o modelo que procura..."
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
            />
            <div className="filter-grid">
              <div className="filter-group">
                <label>Marca</label>
                <select
                  className="select-sleek"
                  value={filtroMarca}
                  onChange={(e) => setFiltroMarca(e.target.value)}
                >
                  <option value="">Todas</option>
                  {TODAS_AS_MARCAS.filter((m) =>
                    veiculos.some(
                      (v) => v.marca === m && v.status === 'Disponível'
                    )
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Ano</label>
                <select
                  className="select-sleek"
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(e.target.value)}
                >
                  <option value="">Todos</option>
                  {ANOS_OPCOES.filter((a) =>
                    veiculos.some(
                      (v) => v.fabricacao === a && v.status === 'Disponível'
                    )
                  ).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Preço</label>
                <select
                  className="select-sleek"
                  value={filtroPreco}
                  onChange={(e) => setFiltroPreco(e.target.value)}
                >
                  <option value="">Qualquer Valor</option>
                  <option value="ate-60k">Até R$ 60.000</option>
                  <option value="60k-100k">R$ 60k a 100k</option>
                  <option value="100k-150k">R$ 100k a 150k</option>
                  <option value="acima-150k">Acima de R$ 150 mil</option>
                </select>
              </div>
              <div className="filter-group">
                <label>KM</label>
                <select
                  className="select-sleek"
                  value={filtroKm}
                  onChange={(e) => setFiltroKm(e.target.value)}
                >
                  <option value="">Qualquer KM</option>
                  <option value="ate-30k">Até 30.000 km</option>
                  <option value="30k-60k">30.000 a 60.000 km</option>
                  <option value="acima-60k">Acima de 60.000 km</option>
                </select>
              </div>
            </div>
            {(filtroMarca ||
              filtroAno ||
              filtroPreco ||
              filtroKm ||
              buscaTermo) && (
              <button
                className="btn-clear-filters"
                onClick={() => {
                  setFiltroMarca('');
                  setFiltroAno('');
                  setFiltroPreco('');
                  setFiltroKm('');
                  setBuscaTermo('');
                }}
              >
                Limpar Filtros
              </button>
            )}
          </section>

          <div className="car-grid">
            {veiculosFiltrados.map((v) => (
              <div key={v.id} className="car-card">
                <div className="car-media-slider">
                  {v.unico_dono && (
                    <div className="badge-unico-dono">ÚNICO DONO</div>
                  )}
                  {v.galeria && v.galeria.length > 0 ? (
                    <div className="media-scroller">
                      {v.galeria.map((midia, index) => (
                        <div key={index} className="media-slide">
                          {midia.tipo === 'video' ? (
                            <video
                              src={midia.url}
                              controls
                              className="media-real-img"
                            />
                          ) : (
                            <img
                              src={midia.url}
                              className="media-real-img"
                              alt={v.modelo}
                              loading="lazy"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="img-placeholder">RESPLANDE</div>
                  )}
                  {v.galeria && v.galeria.length > 1 && (
                    <div className="swipe-hint">deslize ➔</div>
                  )}
                </div>

                <div className="car-details">
                  <div className="car-header-center">
                    <span className="car-marca-label">{v.marca}</span>
                    <h3 className="car-model-title">{v.modelo}</h3>
                  </div>
                  <div className="car-meta">
                    <span>{v.fabricacao}</span>
                    <span className="separator">|</span>
                    <span>{v.km} km</span>
                  </div>

                  {(v.blindado || v.laudo_cautelar || v.ipva_pago) && (
                    <div className="car-tags-container">
                      {v.blindado && (
                        <span className="car-tag tag-blindado">
                          🛡️ Blindado
                        </span>
                      )}
                      {v.laudo_cautelar && (
                        <span className="car-tag tag-laudo">
                          ✅ Laudo Cautelar
                        </span>
                      )}
                      {v.ipva_pago && (
                        <span className="car-tag tag-ipva">💳 IPVA Pago</span>
                      )}
                    </div>
                  )}

                  <div className="card-divider"></div>

                  <div className="car-footer">
                    <div className="price-container">
                      {/* O Riscado SÓ aparece se a promoção estiver ATIVA via Admin */}
                      {v.em_promocao && v.preco_antigo && (
                        <span className="car-price-old">
                          De R$ {v.preco_antigo} por
                        </span>
                      )}
                      <span className="car-price">R$ {v.preco}</span>
                    </div>
                    <button
                      className="btn-interesse"
                      onClick={() => handleInteresse(v)}
                    >
                      Interesse
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {veiculosFiltrados.length === 0 && (
              <p
                style={{
                  textAlign: 'center',
                  color: '#666',
                  marginTop: '20px',
                }}
              >
                Nenhum veículo encontrado.
              </p>
            )}
          </div>

          {videosGaleria.length > 0 && (
            <section className="sec-videos">
              <h2 className="sec-title">Galeria de Vídeos</h2>
              <div className="video-grid">
                {videosGaleria.map((vid) => (
                  <div key={vid.id} className="video-card">
                    <video
                      src={vid.url}
                      controls
                      preload="metadata"
                      className="media-real-img"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="sec-entregas">
            <h2 className="sec-title">Nossos Clientes</h2>
            <div className="stats-dashboard">
              <div className="stat-box" style={{ width: '100%' }}>
                <span className="stat-number">+{config.vendas_contador}</span>
                <span className="stat-label">
                  veículos vendidos com procedência
                </span>
              </div>
            </div>

            <div className="entregas-grid">
              {avaliacoes
                .filter(
                  (a) => a.aprovado === true || String(a.aprovado) === 'true'
                )
                .map((a) => (
                  <div key={a.id} className="entrega-card">
                    {a.foto_url ? (
                      <img
                        src={a.foto_url}
                        className="entrega-img"
                        alt="Cliente"
                      />
                    ) : (
                      <div className="no-photo-cliente">🚗</div>
                    )}
                    <div className="entrega-overlay">
                      <p className="entrega-depoimento">
                        &quot;{a.texto}&quot;
                      </p>
                      <span className="entrega-cliente">— {a.nome}</span>
                    </div>
                  </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                className="btn-interesse"
                style={{ width: '100%', maxWidth: '300px' }}
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? 'Cancelar' : 'Deixar minha avaliação'}
              </button>
            </div>

            {showReviewForm && (
              <form
                onSubmit={(e) => enviarAvaliacao(e, false)}
                className="public-review-form"
              >
                <input
                  placeholder="Seu Nome"
                  value={pubReview.nome}
                  onChange={(e) =>
                    setPubReview({ ...pubReview, nome: e.target.value })
                  }
                  required
                />
                <textarea
                  placeholder="Como foi sua experiência?"
                  value={pubReview.texto}
                  onChange={(e) =>
                    setPubReview({ ...pubReview, texto: e.target.value })
                  }
                  required
                  rows={3}
                />
                <label
                  style={{
                    fontSize: '12px',
                    color: '#cfa44c',
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Envie seu momento conosco (Opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setPubReviewFile(e.target.files?.[0] || null)
                  }
                />
                <button
                  type="submit"
                  className="btn-submit-car"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Enviar Avaliação'}
                </button>
              </form>
            )}
          </section>

          {institucionais.length > 0 && (
            <section className="about-accordion-section">
              <h2 className="sec-title">Conheça a Resplande</h2>
              <div className="accordion-wrapper">
                {institucionais.map((item) => (
                  <div
                    key={item.id}
                    className={`accordion-item ${
                      activeAccordion === item.id ? 'open' : ''
                    }`}
                  >
                    <div
                      className="accordion-header"
                      onClick={() =>
                        setActiveAccordion(
                          activeAccordion === item.id ? null : item.id
                        )
                      }
                    >
                      <span>{item.titulo}</span>
                      <span className="accordion-icon">
                        {activeAccordion === item.id ? '−' : '+'}
                      </span>
                    </div>
                    <div className="accordion-content">
                      <p>{item.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
        <div className="floating-buttons">
          <a
            href={`https://wa.me/${config.whatsapp}`}
            className="fab-wpp"
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" width="30" height="30">
              <path
                fill="currentColor"
                d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"
              />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  // ================= VIEW ADMIN =================
  return (
    <div className="app-admin">
      <header className="header-main">
        <HeaderLogo />
        <button className="btn-admin-access" onClick={() => setView('public')}>
          Ver Site
        </button>
      </header>

      <nav className="admin-nav">
        <button
          className={adminTab === 'inicio' ? 'active' : ''}
          onClick={() => setAdminTab('inicio')}
        >
          Início
        </button>
        <button
          className={adminTab === 'avaliacoes' ? 'active' : ''}
          onClick={() => setAdminTab('avaliacoes')}
        >
          Clientes
        </button>
        <button
          className={adminTab === 'videos' ? 'active' : ''}
          onClick={() => setAdminTab('videos')}
        >
          Vídeos
        </button>
        <button
          className={adminTab === 'institucional' ? 'active' : ''}
          onClick={() => setAdminTab('institucional')}
        >
          Institucional
        </button>
        <button
          className={adminTab === 'novo_veiculo' ? 'active' : ''}
          onClick={() => setAdminTab('novo_veiculo')}
        >
          Novo Veículo
        </button>
        <button
          className={adminTab === 'meu_estoque' ? 'active' : ''}
          onClick={() => setAdminTab('meu_estoque')}
        >
          Meu Estoque
        </button>
      </nav>

      <main className="admin-box">
        {adminTab === 'inicio' && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>
              Página Inicial
            </h3>
            <label>Título Principal</label>
            <input
              value={config.hero_title || ''}
              onChange={(e) =>
                setConfig({ ...config, hero_title: e.target.value })
              }
            />
            <label>WhatsApp (DDI + DDD + Número)</label>
            <input
              value={config.whatsapp || ''}
              onChange={(e) =>
                setConfig({ ...config, whatsapp: e.target.value })
              }
            />
            <label>Estatística "Veículos Vendidos"</label>
            <input
              type="number"
              value={config.vendas_contador || 0}
              onChange={(e) =>
                setConfig({
                  ...config,
                  vendas_contador: Number(e.target.value),
                })
              }
            />
            <button
              className="btn-submit-car"
              onClick={salvarConfig}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Textos Globais'}
            </button>
          </div>
        )}

        {adminTab === 'avaliacoes' && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>
              Gerenciar Avaliações
            </h3>
            <form
              onSubmit={(e) => enviarAvaliacao(e, true)}
              style={{
                background: '#111',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #262626',
                marginBottom: '30px',
              }}
            >
              <label style={{ color: '#cfa44c' }}>
                Adicionar Avaliação Manual
              </label>
              <input
                placeholder="Nome do Cliente"
                value={pubReview.nome}
                onChange={(e) =>
                  setPubReview({ ...pubReview, nome: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Depoimento do Cliente"
                value={pubReview.texto}
                onChange={(e) =>
                  setPubReview({ ...pubReview, texto: e.target.value })
                }
                required
                rows={3}
              />
              <label
                style={{
                  fontSize: '12px',
                  color: '#cfa44c',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Envie seu momento conosco
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPubReviewFile(e.target.files?.[0] || null)}
              />
              <button
                type="submit"
                className="btn-submit-car"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Publicar Avaliação'}
              </button>
            </form>
            {avaliacoes.map((a) => (
              <div
                key={a.id}
                style={{
                  background: '#1a1a1a',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  border: '1px solid #333',
                  display: 'flex',
                  gap: '15px',
                }}
              >
                {a.foto_url && (
                  <img
                    src={a.foto_url}
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: 'white',
                      fontSize: '14px',
                      display: 'block',
                    }}
                  >
                    {a.nome}
                  </strong>
                  <p style={{ fontSize: '12px', color: '#a0a0a0' }}>
                    &quot;{a.texto}&quot;
                  </p>
                  <span
                    style={{
                      fontSize: '10px',
                      color: a.aprovado ? '#25D366' : '#ff4d4d',
                    }}
                  >
                    {a.aprovado ? 'APROVADA' : 'AGUARDANDO'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  {!a.aprovado && (
                    <button
                      onClick={() => aprovarAvaliacao(a.id)}
                      style={{
                        background: '#25D366',
                        color: '#fff',
                        border: 'none',
                        padding: '5px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      Aprovar
                    </button>
                  )}
                  <button
                    onClick={() => deletarAvaliacao(a.id)}
                    style={{
                      background: '#ff4d4d',
                      color: '#fff',
                      border: 'none',
                      padding: '5px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {adminTab === 'videos' && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>
              Galeria de Vídeos
            </h3>
            <form
              onSubmit={adicionarVideoGaleria}
              style={{
                background: '#111',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #262626',
                marginBottom: '30px',
              }}
            >
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                required
              />
              <button
                type="submit"
                className="btn-submit-car"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Subir Vídeo'}
              </button>
            </form>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
              }}
            >
              {videosGaleria.map((vid) => (
                <div
                  key={vid.id}
                  style={{
                    position: 'relative',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <video
                    src={vid.url}
                    controls
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <button
                    onClick={() => deletarVideo(vid.id)}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: '#ff4d4d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    Apagar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'institucional' && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>
              Sessão Institucional
            </h3>
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                style={{
                  background: '#1a1a1a',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  border: '1px solid #262626',
                }}
              >
                <label>Retângulo {num} - Título</label>
                <input
                  value={config[`secao_${num}_titulo`] || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [`secao_${num}_titulo`]: e.target.value,
                    })
                  }
                  style={{ background: '#0a0a0a' }}
                />
                <label>Retângulo {num} - Texto</label>
                <textarea
                  value={config[`secao_${num}_texto`] || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [`secao_${num}_texto`]: e.target.value,
                    })
                  }
                  style={{ background: '#0a0a0a' }}
                />
              </div>
            ))}
            <button
              className="btn-submit-car"
              onClick={salvarConfig}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Textos'}
            </button>
          </div>
        )}

        {adminTab === 'novo_veiculo' && (
          <form onSubmit={salvarVeiculo}>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>
              Cadastrar Novo Veículo
            </h3>
            <select
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              required
              className="select-sleek"
            >
              <option value="">Selecione a Marca...</option>
              {TODAS_AS_MARCAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              placeholder="Modelo (ex: C3)"
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              required
            />
            <select
              value={form.fabricacao}
              onChange={(e) => setForm({ ...form, fabricacao: e.target.value })}
              required
              className="select-sleek"
            >
              <option value="">Ano de Fabricação...</option>
              {ANOS_OPCOES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              placeholder="Quilometragem (ex: 1200)"
              value={form.km}
              onChange={(e) => setForm({ ...form, km: e.target.value })}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
              }}
            >
              <div>
                <label>Preço Ofertado (R$)</label>
                <p
                  style={{
                    fontSize: '10px',
                    color: '#888',
                    marginBottom: '5px',
                  }}
                >
                  Ex: Para R$ 76.000,00 digite 7600000
                </p>
                <input
                  placeholder="0,00"
                  value={form.preco}
                  onChange={(e) => handlePrecoChange(e.target.value, 'preco')}
                  required
                />
              </div>
              <div>
                <label>Preço Antigo (Cortado)</label>
                <p
                  style={{
                    fontSize: '10px',
                    color: '#888',
                    marginBottom: '5px',
                  }}
                >
                  Deixe vazio se não houver promoção.
                </p>
                <input
                  placeholder="0,00"
                  value={form.preco_antigo}
                  onChange={(e) =>
                    handlePrecoChange(e.target.value, 'preco_antigo')
                  }
                />
              </div>
            </div>

            <div
              style={{
                background: '#111',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #262626',
                marginBottom: '20px',
              }}
            >
              <label style={{ color: '#cfa44c', marginBottom: '10px' }}>
                Diferenciais e Tags do Veículo
              </label>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.unico_dono}
                  onChange={(e) =>
                    setForm({ ...form, unico_dono: e.target.checked })
                  }
                />
                <label>Único Dono</label>
              </div>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.blindado}
                  onChange={(e) =>
                    setForm({ ...form, blindado: e.target.checked })
                  }
                />
                <label>Veículo Blindado</label>
              </div>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.laudo_cautelar}
                  onChange={(e) =>
                    setForm({ ...form, laudo_cautelar: e.target.checked })
                  }
                />
                <label>Laudo Cautelar Aprovado</label>
              </div>
              <div className="checkbox-row" style={{ marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={form.ipva_pago}
                  onChange={(e) =>
                    setForm({ ...form, ipva_pago: e.target.checked })
                  }
                />
                <label>IPVA Pago</label>
              </div>
            </div>

            <label
              style={{
                marginTop: '20px',
                color: '#cfa44c',
                fontWeight: 'bold',
              }}
            >
              Mídia (Fotos e Vídeos)
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setArquivos(Array.from(e.target.files || []))}
            />

            <button type="submit" className="btn-submit-car" disabled={loading}>
              {loading ? 'Enviando...' : 'Publicar Veículo'}
            </button>
          </form>
        )}

        {adminTab === 'meu_estoque' && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>
              Gerenciar Estoque
            </h3>
            <p
              style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}
            >
              Oculte, Exclua ou ative a "Promoção" para exibir o preço riscado.
            </p>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
            >
              {veiculos.map((v) => (
                <div
                  key={v.id}
                  style={{
                    background: '#1a1a1a',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                  }}
                >
                  {v.galeria && v.galeria[0] ? (
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {v.galeria[0].tipo === 'foto' ? (
                        <img
                          src={v.galeria[0].url}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <video
                          src={v.galeria[0].url}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        background: '#000',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <div style={{ flex: 1 }}>
                    <strong
                      style={{
                        color: 'white',
                        display: 'block',
                        fontSize: '14px',
                        lineHeight: '1.2',
                        marginBottom: '4px',
                      }}
                    >
                      {v.marca} {v.modelo}
                    </strong>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#a0a0a0',
                        display: 'block',
                      }}
                    >
                      R$ {v.preco}
                    </span>
                    {v.preco_antigo && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#888',
                          textDecoration: 'line-through',
                        }}
                      >
                        De: R$ {v.preco_antigo}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* BOTÃO DAR PROMOÇÃO AQUI */}
                    {v.preco_antigo && (
                      <button
                        onClick={() =>
                          togglePromocao(v.id, v.em_promocao || false)
                        }
                        style={{
                          background: v.em_promocao
                            ? 'transparent'
                            : 'var(--accent-gold)',
                          color: v.em_promocao ? 'var(--accent-gold)' : 'black',
                          border: `1px solid var(--accent-gold)`,
                          padding: '6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        {v.em_promocao
                          ? '❌ Tirar Promoção'
                          : '🎁 Dar Promoção'}
                      </button>
                    )}

                    <select
                      value={v.status}
                      onChange={(e) =>
                        atualizarStatusVeiculo(v.id, e.target.value)
                      }
                      style={{
                        padding: '6px',
                        borderRadius: '4px',
                        background: '#000',
                        color: 'white',
                        border: '1px solid #444',
                        fontSize: '11px',
                        outline: 'none',
                      }}
                    >
                      <option value="Disponível">✅ Disponível</option>
                      <option value="Oculto">👁️ Ocultar</option>
                      <option value="Vendido">🤝 Vendido</option>
                    </select>
                    <button
                      onClick={() => deletarVeiculo(v.id)}
                      style={{
                        background: '#ff4d4d',
                        color: 'white',
                        border: 'none',
                        padding: '6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
              {veiculos.length === 0 && (
                <p
                  style={{
                    color: '#888',
                    fontSize: '13px',
                    textAlign: 'center',
                  }}
                >
                  Estoque vazio.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
