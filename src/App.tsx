import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

interface Midia { tipo: 'foto' | 'video'; url: string; }
interface Veiculo { 
  id?: number; marca: string; modelo: string; fabricacao: string; km: string; preco: string; 
  status: 'Disponível' | 'Vendido' | 'Oculto'; galeria: Midia[]; unico_dono: boolean;
  cliente_nome?: string; depoimento_venda?: string;
  blindado?: boolean; laudo_cautelar?: boolean; ipva_pago?: boolean; revisoes_concessionaria?: boolean;
  preco_antigo?: string; em_promocao?: boolean; combustivel?: string; cambio?: string; tipo_carro?: string;
}
interface Avaliacao { id: number; nome: string; texto: string; foto_url: string; aprovado: boolean; }
interface VideoGaleria { id: number; url: string; titulo: string; descricao: string; }
interface Banner { id: number; url: string; }

const TODAS_AS_MARCAS = ['Audi', 'BMW', 'BYD', 'Caoa Chery', 'Chevrolet', 'Citroën', 'Fiat', 'Ford', 'GWM', 'Honda', 'Hyundai', 'Jeep', 'Kia', 'Land Rover', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Peugeot', 'Porsche', 'Renault', 'Suzuki', 'Toyota', 'Volkswagen', 'Volvo'].sort();
const ANOS_OPCOES = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010'];
const TIPOS_CARRO = ['Hatch', 'Sedan', 'SUV', 'Picape', 'Crossover', 'Minivan', 'Esportivo', 'Van', 'Perua'].sort();

const FRASES_MOTIVACIONAIS_FALLBACK = [
  "Acelere em direção aos seus sonhos. Seu novo carro está aqui.",
  "O sucesso é a soma de pequenos esforços. A recompensa é o conforto da sua família."
];

const formatCurrencyBR = (value: any) => {
  let v = String(value || '').replace(/\D/g, ''); 
  if (!v) return '';
  v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ','); 
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); 
  return v;
};

const sanitizeNumber = (str: any) => Number(String(str || '').replace(/\D/g, ''));

export default function App() {
  const [view, setView] = useState<'public' | 'admin'>('public');
  const [adminTab, setAdminTab] = useState<'inicio' | 'novo_veiculo' | 'meu_estoque' | 'videos' | 'avaliacoes' | 'institucional'>('inicio');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [videosGaleria, setVideosGaleria] = useState<VideoGaleria[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [config, setConfig] = useState<any>({ 
    hero_title: "Seu próximo carro está aqui.",
    hero_subtitle: "Há 4 anos realizando negócios com solidez e honestidade.",
    whatsapp: "5585996359338", 
    instagram: "", 
    vendas_contador: 180,
    titulo_estoque: "NOSSO ESTOQUE COMPLETO",
    titulo_top_cars: "TOP CARS DO NOSSO ESTOQUE",
    titulo_videos: "RESPLANDE LIFE",
    titulo_clientes: "NOSSOS CLIENTES",
    titulo_institucional: "CONHEÇA A RESPLANDE"
  });

  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroPreco, setFiltroPreco] = useState('');
  const [filtroKm, setFiltroKm] = useState('');
  const [filtroCombustivel, setFiltroCombustivel] = useState('');
  const [filtroCambio, setFiltroCambio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [pubReview, setPubReview] = useState({ nome: '', texto: '' });
  const [pubReviewFile, setPubReviewFile] = useState<File | null>(null);

  const [publicTab, setPublicTab] = useState<'home' | 'estoque' | 'vender'>('home');
  const [formVender, setFormVender] = useState({ ano: '', modelo: '', versao: '', km: '' });

  const [fraseAtiva, setFraseAtiva] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const carouselRef = useRef<any>(null);
  const bannersRef = useRef<any>(null);

  useEffect(() => {
    document.body.className = view === 'admin' ? 'theme-dark' : `theme-${theme}`;
  }, [theme, view]);

  useEffect(() => { 
    fetchConfig(); fetchVeiculos(); fetchAvaliacoes(); fetchVideos(); fetchBanners(); 
  }, []);

  useEffect(() => {
    const scrollCarousel = (element: HTMLDivElement | null, step: number) => {
      if (element && view === 'public' && publicTab === 'home') {
        const { scrollLeft, scrollWidth, clientWidth } = element;
        if (scrollLeft + clientWidth >= scrollWidth - 10) element.scrollTo({ left: 0, behavior: 'smooth' });
        else element.scrollBy({ left: step, behavior: 'smooth' });
      }
    };

    const intervalCarousels = setInterval(() => {
      if (carouselRef.current) scrollCarousel(carouselRef.current, carouselRef.current.clientWidth / 2);
      if (bannersRef.current) scrollCarousel(bannersRef.current, bannersRef.current.clientWidth);
    }, 4000);

    const intervalFrases = setInterval(() => setFraseAtiva((prev) => prev + 1), 5000);

    return () => { clearInterval(intervalCarousels); clearInterval(intervalFrases); }
  }, [view, publicTab]);

  async function fetchConfig() { try { const { data } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle(); if (data) setConfig(data); } catch (e) {} }
  async function fetchVeiculos() { try { const { data } = await supabase.from('veiculos').select('*').order('id', { ascending: false }); if (data) setVeiculos(data); } catch (e) {} }
  async function fetchAvaliacoes() { try { const { data } = await supabase.from('avaliacoes').select('*').order('id', { ascending: false }); if (data) setAvaliacoes(data); } catch (e) {} }
  async function fetchVideos() { try { const { data } = await supabase.from('galeria_videos').select('*').order('id', { ascending: false }); if (data) setVideosGaleria(data); } catch (e) {} }
  async function fetchBanners() { try { const { data } = await supabase.from('banners').select('*').order('id', { ascending: true }); if (data) setBanners(data); } catch (e) {} }

  const listaVeiculos = Array.isArray(veiculos) ? veiculos : [];
  
  const veiculosFiltrados = listaVeiculos.filter(v => {
    if (v.status !== 'Disponível') return false;
    
    const matchMarca = !filtroMarca || v.marca === filtroMarca;
    const matchAno = !filtroAno || v.fabricacao === filtroAno;
    const matchCombustivel = !filtroCombustivel || v.combustivel === filtroCombustivel;
    const matchCambio = !filtroCambio || v.cambio === filtroCambio;
    const matchTipo = !filtroTipo || v.tipo_carro === filtroTipo;
    
    const kmNum = sanitizeNumber(v.km);
    let matchKm = true;
    if (filtroKm === 'ate-30k') matchKm = kmNum <= 30000;
    else if (filtroKm === '30k-60k') matchKm = kmNum > 30000 && kmNum <= 60000;
    else if (filtroKm === 'acima-60k') matchKm = kmNum > 60000;

    const precoNum = sanitizeNumber(v.preco); 
    let matchPreco = true;
    if (filtroPreco === 'ate-60k') matchPreco = precoNum <= 6000000; 
    else if (filtroPreco === '60k-100k') matchPreco = precoNum > 6000000 && precoNum <= 10000000;
    else if (filtroPreco === '100k-150k') matchPreco = precoNum > 10000000 && precoNum <= 15000000;
    else if (filtroPreco === 'acima-150k') matchPreco = precoNum > 15000000;

    return matchMarca && matchAno && matchKm && matchPreco && matchCombustivel && matchCambio && matchTipo;
  });

  const veiculosExibidos = publicTab === 'estoque' ? veiculosFiltrados : veiculosFiltrados.slice(0, 3);

  const frasesDoBanco = [config?.frase_1, config?.frase_2, config?.frase_3, config?.frase_4, config?.frase_5].filter(Boolean);
  const frasesAtivasCarousel = frasesDoBanco.length > 0 ? frasesDoBanco : FRASES_MOTIVACIONAIS_FALLBACK;

  const getWhatsAppLink = (msg?: string) => {
    const rawNumber = String(config?.whatsapp || '5585996359338');
    const cleanNumber = rawNumber.replace(/\D/g, ''); 
    return `https://wa.me/${cleanNumber}${msg ? `?text=${msg}` : ''}`;
  };

  const handleInteresse = (v: Veiculo) => {
    const msg = encodeURIComponent(`Olá! Tenho interesse no ${v.marca} ${v.modelo} (${v.fabricacao}) que vi no site.`);
    window.open(getWhatsAppLink(msg), '_blank');
  };

  async function uploadMidiaSingle(file: File) {
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`; 
      const { data, error } = await supabase.storage.from('veiculos-media').upload(fileName, file);
      if (!error && data) return supabase.storage.from('veiculos-media').getPublicUrl(fileName).data.publicUrl;
      return null;
    } catch (e) { return null; }
  }

  const [editingId, setEditingId] = useState<number | null>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [form, setForm] = useState<Veiculo>({ 
    marca: '', modelo: '', fabricacao: '', km: '', preco: '', preco_antigo: '', 
    status: 'Disponível', unico_dono: false, blindado: false, laudo_cautelar: false, 
    ipva_pago: false, revisoes_concessionaria: false, em_promocao: false, 
    combustivel: 'Flex', cambio: 'Automático', tipo_carro: 'Hatch', galeria: []
  });

  const prepararEdicaoVeiculo = (v: Veiculo) => { 
    setForm({ ...v }); setEditingId(v.id || null); setAdminTab('novo_veiculo'); setArquivos([]); 
  };

  const cancelarEdicaoVeiculo = () => {
    setForm({ 
      marca: '', modelo: '', fabricacao: '', km: '', preco: '', preco_antigo: '', 
      status: 'Disponível', unico_dono: false, blindado: false, laudo_cautelar: false, 
      ipva_pago: false, revisoes_concessionaria: false, em_promocao: false, 
      combustivel: 'Flex', cambio: 'Automático', tipo_carro: 'Hatch', galeria: [] 
    });
    setEditingId(null); setArquivos([]);
  };

  const salvarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (arquivos.length === 0 && !editingId) { alert("Selecione pelo menos uma foto!"); return; }
    
    setLoading(true); setUploadProgress(10);
    let novaGaleria = Array.isArray(form.galeria) ? form.galeria : []; 
    if (arquivos.length > 0) {
      novaGaleria = [];
      for (let i = 0; i < arquivos.length; i++) {
        const url = await uploadMidiaSingle(arquivos[i]);
        if (url) novaGaleria.push({ tipo: arquivos[i].type.startsWith('video/') ? 'video' : 'foto', url });
        setUploadProgress(Math.round(((i + 1) / arquivos.length) * 100));
      }
    }
    
    const payload = { ...form, galeria: novaGaleria }; delete payload.id; 
    
    if (editingId) { 
      const { error } = await supabase.from('veiculos').update(payload).eq('id', editingId); 
      if (error) alert("Erro ao atualizar o banco de dados. Motivo: " + error.message);
      else { alert("Veículo atualizado!"); cancelarEdicaoVeiculo(); fetchVeiculos(); setAdminTab('meu_estoque'); }
    } else { 
      const { error } = await supabase.from('veiculos').insert([payload]); 
      if (error) alert("Erro ao publicar! O banco recusou. Motivo: " + error.message);
      else { alert("Veículo publicado com sucesso!"); cancelarEdicaoVeiculo(); fetchVeiculos(); setAdminTab('meu_estoque'); }
    }
    setLoading(false); setUploadProgress(0);
  };

  const atualizarStatusVeiculo = async (id: number, novoStatus: string) => { await supabase.from('veiculos').update({ status: novoStatus }).eq('id', id); fetchVeiculos(); };
  const deletarVeiculo = async (id: number) => { if (window.confirm("Excluir este veículo?")) { await supabase.from('veiculos').delete().eq('id', id); fetchVeiculos(); } };
  const togglePromocao = async (id: number, statusAtual: boolean) => { await supabase.from('veiculos').update({ em_promocao: !statusAtual }).eq('id', id); fetchVeiculos(); };

  const [vidForm, setVidForm] = useState({ file: null as File | null, titulo: '', descricao: '', existingUrl: '' });
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);

  const prepararEdicaoVideo = (vid: VideoGaleria) => { setVidForm({ file: null, titulo: vid.titulo, descricao: vid.descricao, existingUrl: vid.url }); setEditingVideoId(vid.id); };
  const cancelarEdicaoVideo = () => { setVidForm({ file: null, titulo: '', descricao: '', existingUrl: '' }); setEditingVideoId(null); };

  const salvarVideoGaleria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vidForm.file && !editingVideoId) { alert("Selecione um arquivo de vídeo!"); return; }
    setLoading(true); setUploadProgress(editingVideoId && !vidForm.file ? 50 : 20);
    
    let url = vidForm.existingUrl;
    if (vidForm.file) {
      const uploadedUrl = await uploadMidiaSingle(vidForm.file);
      if (uploadedUrl) url = uploadedUrl;
      setUploadProgress(80);
    }
    
    const payload = { url, titulo: vidForm.titulo, descricao: vidForm.descricao };
    if (editingVideoId) { 
      const {error} = await supabase.from('galeria_videos').update(payload).eq('id', editingVideoId); 
      if(error) alert(error.message); else { alert("Atualizado!"); cancelarEdicaoVideo(); fetchVideos(); }
    } else { 
      const {error} = await supabase.from('galeria_videos').insert([payload]); 
      if(error) alert(error.message); else { alert("Adicionado!"); cancelarEdicaoVideo(); fetchVideos(); }
    }
    setLoading(false); setUploadProgress(0);
  };
  const deletarVideo = async (id: number) => { if(window.confirm("Apagar vídeo?")) { await supabase.from('galeria_videos').delete().eq('id', id); fetchVideos(); } };

  const adicionarBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    setLoading(true);
    const url = await uploadMidiaSingle(file);
    if(url) { 
      const {error} = await supabase.from('banners').insert([{ url }]); 
      if(error) alert(error.message); else { fetchBanners(); alert("Banner adicionado!"); } 
    }
    setLoading(false);
  }
  const deletarBanner = async (id: number) => { if(window.confirm("Apagar Banner?")) { await supabase.from('banners').delete().eq('id', id); fetchBanners(); } }

  const enviarAvaliacao = async (e: React.FormEvent, isAdmin: boolean) => {
    e.preventDefault(); setLoading(true); setUploadProgress(50);
    let foto_url = '';
    if (pubReviewFile) { const url = await uploadMidiaSingle(pubReviewFile); if (url) foto_url = url; }
    const {error} = await supabase.from('avaliacoes').insert([{ nome: pubReview.nome, texto: pubReview.texto, foto_url, aprovado: isAdmin }]);
    if (error) alert(error.message); else alert(isAdmin ? "Publicada!" : "Enviada! Aguarde aprovação.");
    setPubReview({ nome: '', texto: '' }); setPubReviewFile(null); setShowReviewForm(false); fetchAvaliacoes();
    setLoading(false); setUploadProgress(0);
  };
  
  const aprovarAvaliacao = async (id: number) => { await supabase.from('avaliacoes').update({ aprovado: true }).eq('id', id); fetchAvaliacoes(); };
  const deletarAvaliacao = async (id: number) => { if(window.confirm("Apagar avaliação?")) { await supabase.from('avaliacoes').delete().eq('id', id); fetchAvaliacoes(); } };
  const handlePrecoChange = (val: string, field: 'preco' | 'preco_antigo') => { setForm({ ...form, [field]: formatCurrencyBR(val) }); };
  
  const salvarConfig = async () => { 
    setLoading(true); 
    const { id, updated_at, brand_name, brand_sub, endereco, historia, ...configToSave } = config; 
    const { error } = await supabase.from('site_config').update(configToSave).eq('id', 1); 
    if (error) alert("Erro ao salvar textos: " + error.message); else alert("Alterações salvas!"); 
    fetchConfig(); 
    setLoading(false); 
  };

  const handleLogoClick = () => {
    setView('public');
    setPublicTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const HeaderLogo = () => (
    <div className="brand-zone" onClick={handleLogoClick} style={{cursor: 'pointer', pointerEvents: 'auto'}}>
      <img src="https://i.imgur.com/eczLsJ5.png" alt="Logo Resplande" className="brand-logo-img" />
      <div className="brand-text-container">
        <h1 className="brand-name">RESPLANDE<span className="brand-sub">VEÍCULOS</span></h1>
      </div>
    </div>
  );

  const listInstitucionais = [
    { id: 1, titulo: config?.secao_1_titulo, texto: config?.secao_1_texto },
    { id: 2, titulo: config?.secao_2_titulo, texto: config?.secao_2_texto },
    { id: 3, titulo: config?.secao_3_titulo, texto: config?.secao_3_texto },
    { id: 4, titulo: config?.secao_4_titulo, texto: config?.secao_4_texto }
  ].filter(item => item.titulo);

  // ================= VIEW PÚBLICA =================
  if (view === 'public') {
    return (
      <div className={`app-public theme-${theme}`}>
        <header className="header-main">
          <HeaderLogo />
          
          <nav className="desktop-top-nav">
            <a href="#inicio" onClick={(e) => { e.preventDefault(); setPublicTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Início</a>
            <a href="#estoque" onClick={(e) => { e.preventDefault(); setPublicTab('estoque'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Estoque</a>
            <a href="#vender" onClick={(e) => { e.preventDefault(); setPublicTab('vender'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Vender Veículo</a>
            <a href="#resplife" onClick={(e) => { e.preventDefault(); setPublicTab('home'); setTimeout(() => document.getElementById('resplife')?.scrollIntoView(), 100); }}>#RespLife</a>
            <a href="#depoimentos" onClick={(e) => { e.preventDefault(); setPublicTab('home'); setTimeout(() => document.getElementById('depoimentos')?.scrollIntoView(), 100); }}>Depoimentos</a>
            <a href="#sobre" onClick={(e) => { e.preventDefault(); setPublicTab('home'); setTimeout(() => document.getElementById('sobre')?.scrollIntoView(), 100); }}>Sobre nós</a>
          </nav>

          <div className="header-actions">
            <button className="theme-toggle-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Mudar tema">
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
              )}
            </button>

            <button className="menu-toggle-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <svg viewBox="0 0 24 24" width="35" height="35" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </button>
          </div>
        </header>

        {isMobileMenuOpen && (
          <nav className="mobile-dropdown-menu">
            <a href="#inicio" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('home'); window.scrollTo(0,0); }}>Início</a>
            <a href="#estoque" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('estoque'); window.scrollTo(0,0); }}>Estoque</a>
            <a href="#vender" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('vender'); window.scrollTo(0,0); }}>Vender Veículo</a>
            <a href="#resplife" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('home'); setTimeout(() => document.getElementById('resplife')?.scrollIntoView(), 100); }}>#RespLife</a>
            <a href="#depoimentos" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('home'); setTimeout(() => document.getElementById('depoimentos')?.scrollIntoView(), 100); }}>Depoimentos</a>
            <a href="#sobre" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('home'); setTimeout(() => document.getElementById('sobre')?.scrollIntoView(), 100); }}>Sobre nós</a>
            <button className="menu-admin-btn" onClick={() => { setIsMobileMenuOpen(false); setView('admin'); }}>⚙️ Admin</button>
          </nav>
        )}

        <main className="content-main">

          {/* ================= TELA: VENDER VEÍCULO ================= */}
          {publicTab === 'vender' && (
            <section className="filter-panel-refined" style={{marginTop: '10px', textAlign: 'center'}}>
              <h2 className="sec-title" style={{ color: 'var(--accent-gold)', marginBottom: '10px' }}>Venda seu Veículo</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '25px' }}>
                Preencha os dados do seu carro e fale direto com a nossa equipe pelo WhatsApp!
              </p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const msg = encodeURIComponent(`Olá! Tenho interesse em vender meu veículo.\n\nAno: ${formVender.ano}\nModelo: ${formVender.modelo}\nVersão: ${formVender.versao}\nKM: ${formVender.km}`);
                window.open(getWhatsAppLink(msg), '_blank');
              }} className="public-review-form" style={{ textAlign: 'left' }}>
                
                <label style={{fontSize: '12px', color: 'var(--accent-gold)', display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Ano</label>
                <input placeholder="Ex: 2022" value={formVender.ano} onChange={e => setFormVender({...formVender, ano: e.target.value})} required />
                
                <label style={{fontSize: '12px', color: 'var(--accent-gold)', display: 'block', marginBottom: '5px', marginTop: '15px', fontWeight: 'bold'}}>Modelo</label>
                <input placeholder="Ex: Corolla" value={formVender.modelo} onChange={e => setFormVender({...formVender, modelo: e.target.value})} required />
                
                <label style={{fontSize: '12px', color: 'var(--accent-gold)', display: 'block', marginBottom: '5px', marginTop: '15px', fontWeight: 'bold'}}>Versão</label>
                <input placeholder="Ex: XEI 2.0" value={formVender.versao} onChange={e => setFormVender({...formVender, versao: e.target.value})} required />
                
                <label style={{fontSize: '12px', color: 'var(--accent-gold)', display: 'block', marginBottom: '5px', marginTop: '15px', fontWeight: 'bold'}}>Quilometragem (KM)</label>
                <input placeholder="Ex: 45000" value={formVender.km} onChange={e => setFormVender({...formVender, km: e.target.value})} required />
                
                <button type="submit" className="btn-submit-car" style={{ marginTop: '25px' }}>📲 Enviar para o WhatsApp</button>
              </form>
            </section>
          )}

          {/* ================= TELA: ESTOQUE COMPLETO ================= */}
          {publicTab === 'estoque' && (
            <section className="filter-panel-refined" style={{marginTop: '10px'}}>
              <div className="filter-grid-6">
                <div className="filter-group"><label>Marca</label><select className="select-sleek" value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)}><option value="">Todas</option>{TODAS_AS_MARCAS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div className="filter-group"><label>Ano</label><select className="select-sleek" value={filtroAno} onChange={e => setFiltroAno(e.target.value)}><option value="">Todos</option>{ANOS_OPCOES.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div className="filter-group"><label>Preço</label><select className="select-sleek" value={filtroPreco} onChange={e => setFiltroPreco(e.target.value)}><option value="">Todos</option><option value="ate-60k">Até R$ 60.000</option><option value="60k-100k">R$ 60k a 100k</option><option value="100k-150k">R$ 100k a 150k</option><option value="acima-150k">Acima R$ 150 mil</option></select></div>
                <div className="filter-group"><label>KM</label><select className="select-sleek" value={filtroKm} onChange={e => setFiltroKm(e.target.value)}><option value="">Todos</option><option value="ate-30k">Até 30.000 km</option><option value="30k-60k">30.000 a 60.000 km</option><option value="acima-60k">Acima de 60.000 km</option></select></div>
                <div className="filter-group"><label>Categoria</label><select className="select-sleek" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}><option value="">Todas</option>{TIPOS_CARRO.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="filter-group"><label>Câmbio</label><select className="select-sleek" value={filtroCambio} onChange={e => setFiltroCambio(e.target.value)}><option value="">Todos</option><option value="Automático">Automático</option><option value="Manual">Manual</option></select></div>
              </div>
              {(filtroMarca || filtroAno || filtroPreco || filtroKm || filtroCombustivel || filtroCambio || filtroTipo) && (
                <button className="btn-clear-filters" onClick={() => { setFiltroMarca(''); setFiltroAno(''); setFiltroPreco(''); setFiltroKm(''); setFiltroCombustivel(''); setFiltroCambio(''); setFiltroTipo(''); }}>Limpar Filtros</button>
              )}
            </section>
          )}

          {/* HOME E ESTOQUE COMPARTILHAM A VITRINE */}
          {(publicTab === 'home' || publicTab === 'estoque') && (
            <>
              {publicTab === 'home' && (
                <>
                  <section className="hero-section" id="inicio">
                    <h2>{config?.hero_title}</h2>
                    <p className="hero-subtitle">{config?.hero_subtitle || 'Há 4 anos realizando negócios com solidez e honestidade.'}</p>
                  </section>

                  {Array.isArray(banners) && banners.length > 0 && (
                    <div className="banners-carousel" ref={bannersRef}>
                      {banners.map(b => (
                        <div key={b.id} className="banner-slide">
                          <img src={b.url} alt="Banner" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <h2 id="estoque" className="sec-title" style={{textAlign: 'center', marginBottom: '25px', color: 'var(--accent-gold)'}}>
                {publicTab === 'estoque' ? (config?.titulo_estoque || "NOSSO ESTOQUE COMPLETO") : (config?.titulo_top_cars || "TOP CARS DO NOSSO ESTOQUE")}
              </h2>

              <div className="car-grid">
                {veiculosExibidos.map(v => (
                  <div key={v.id} className={`car-card ${publicTab === 'home' ? 'card-compact' : ''}`}>
                    <div className="car-media-slider">
                      {v.blindado && <div className="badge-blindado">🛡️ BLINDADO</div>}
                      
                      {Array.isArray(v.galeria) && v.galeria.length > 0 ? (
                        <div className="media-scroller">
                          {v.galeria.map((midia: any, index: number) => (
                            <div key={index} className="media-slide">
                              {midia?.tipo === 'video' ? (
                                <video src={`${midia?.url}#t=0.001`} controls preload="metadata" className="media-real-img" />
                              ) : (
                                <img src={midia?.url} className="media-real-img clickable-img" alt={v?.modelo || 'Veiculo'} loading="lazy" onClick={() => setExpandedImage(midia?.url)} />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : <div className="img-placeholder">RESPLANDE</div>}
                      {Array.isArray(v.galeria) && v.galeria.length > 1 && <div className="swipe-hint">deslize ➔</div>}
                    </div>
                    
                    <div className="car-details">
                      <div className="car-header-center">
                        <span className="car-marca-label">{v.marca}</span>
                        <h3 className="car-model-title">{v.modelo}</h3>
                      </div>
                      
                      <div className="car-meta">
                        <span>{v.fabricacao}</span><span className="separator">|</span>
                        <span>{v.km} km</span><span className="separator">|</span>
                        <span>{v.combustivel || 'Flex'}</span><span className="separator">|</span>
                        <span>{v.cambio || 'Automático'}</span><span className="separator">|</span>
                        <span>{v.tipo_carro || 'Hatch'}</span>
                      </div>
                      
                      {(v.unico_dono || v.laudo_cautelar || v.ipva_pago || v.revisoes_concessionaria) && (
                        <div className="car-tags-container-left">
                          {v.unico_dono && <span className="car-tag tag-verde">⭐ Único Dono</span>}
                          {v.revisoes_concessionaria && <span className="car-tag tag-verde">🔧 Revisões</span>}
                          {v.laudo_cautelar && <span className="car-tag tag-verde">✅ Cautelar</span>}
                          {v.ipva_pago && <span className="car-tag tag-verde">💳 IPVA</span>}
                        </div>
                      )}

                      <div className="card-divider"></div>
                      
                      <div className="car-footer">
                        <div className="price-container">
                          {v.em_promocao && v.preco_antigo && <span className="car-price-old">De R$ {v.preco_antigo}</span>}
                          <span className="car-price">R$ {v.preco}</span>
                        </div>
                        <button className="btn-interesse" onClick={() => handleInteresse(v)}>Interesse</button>
                      </div>
                    </div>
                  </div>
                ))}
                {veiculosFiltrados.length === 0 && <p style={{textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px'}}>Nenhum veículo encontrado.</p>}
              </div>

              {publicTab === 'home' && (
                <div style={{textAlign: 'center', margin: '50px 0'}}>
                  <button className="btn-estoque-completo" onClick={() => { setPublicTab('estoque'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>VEJA NOSSO ESTOQUE COMPLETO ➔</button>
                </div>
              )}
            </>
          )}

          {/* AS SESSÕES ABAIXO SÓ APARECEM NA HOME */}
          {publicTab === 'home' && Array.isArray(videosGaleria) && videosGaleria.length > 0 && (
            <section id="resplife" className="sec-videos">
              <h2 className="sec-title">{config?.titulo_videos || "RESPLANDE LIFE"}</h2>
              <div className="videos-carousel">
                {videosGaleria.map(vid => (
                  <div key={vid.id} className="video-card-slide">
                    <video src={`${vid.url}#t=0.001`} controls preload="metadata" className="video-player-public" />
                    <div className="video-info">
                      <h4>{vid.titulo || "Experiência Resplande"}</h4>
                      {vid.descricao && <p>{vid.descricao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {publicTab === 'home' && (
            <section id="depoimentos" className="sec-entregas">
              <h2 className="sec-title">{config?.titulo_clientes || "NOSSOS CLIENTES"}</h2>
              <div className="stats-dashboard">
                <div className="stat-box" style={{width: '100%'}}>
                  <span className="stat-number">+{config?.vendas_contador || 0}</span>
                  <span className="stat-label">veículos vendidos com procedência</span>
                </div>
              </div>
              
              <div className="entregas-carousel" ref={carouselRef}>
                {Array.isArray(avaliacoes) && avaliacoes.filter(a => a?.aprovado === true || String(a?.aprovado) === 'true').map(a => (
                  <div key={a.id} className="entrega-card-slide">
                    {a.foto_url ? (
                      <img src={a.foto_url} className="entrega-img clickable-img" alt="Cliente" onClick={() => setExpandedImage(a.foto_url)} />
                    ) : (
                      <div className="no-photo-cliente">🚗</div>
                    )}
                    <div className="entrega-overlay">
                      <p className="entrega-depoimento">&quot;{a.texto}&quot;</p>
                      <span className="entrega-cliente">— {a.nome}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{textAlign: 'center', marginTop: '20px'}}>
                <button className="btn-interesse" style={{width: '100%', maxWidth: '300px'}} onClick={() => setShowReviewForm(!showReviewForm)}>
                  {showReviewForm ? 'Cancelar' : 'Deixar minha avaliação'}
                </button>
              </div>
              
              {showReviewForm && (
                <form onSubmit={e => enviarAvaliacao(e, false)} className="public-review-form">
                  <input placeholder="Seu Nome" value={pubReview.nome || ''} onChange={e => setPubReview({...pubReview, nome: e.target.value})} required />
                  <textarea placeholder="Como foi sua experiência?" value={pubReview.texto || ''} onChange={e => setPubReview({...pubReview, texto: e.target.value})} required rows={3} />
                  <label style={{fontSize: '12px', color: 'var(--accent-gold)', display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Envie seu momento conosco (Opcional)</label>
                  <input type="file" accept="image/*" onChange={e => setPubReviewFile(e.target.files?.[0] || null)} />
                  {loading && uploadProgress > 0 && (
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                  <button type="submit" className="btn-submit-car" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Avaliação'}
                  </button>
                </form>
              )}
            </section>
          )}

          {publicTab === 'home' && (
            <section className="motivational-panel">
              <h3 className="motivational-quotes">&quot;</h3>
              <p className="motivational-text">
                {frasesAtivasCarousel[fraseAtiva % frasesAtivasCarousel.length]}
              </p>
            </section>
          )}

          {publicTab === 'home' && Array.isArray(listInstitucionais) && listInstitucionais.length > 0 && (
            <section id="sobre" className="about-accordion-section">
              <h2 className="sec-title">{config?.titulo_institucional || "CONHEÇA A RESPLANDE"}</h2>
              <div className="accordion-wrapper">
                {listInstitucionais.map((item) => (
                  <div key={item.id} className={`accordion-item ${activeAccordion === item.id ? 'open' : ''}`}>
                    <div className="accordion-header" onClick={() => setActiveAccordion(activeAccordion === item.id ? null : item.id)}>
                      <span>{item.titulo}</span>
                      <span className="accordion-icon">{activeAccordion === item.id ? '−' : '+'}</span>
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
          {config?.instagram && (
            <a href={config.instagram} className="fab-insta" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          )}
          <a href={getWhatsAppLink()} className="fab-wpp" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" width="30" height="30"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"/></svg>
          </a>
        </div>

        {expandedImage && (
          <div className="image-modal-overlay" onClick={() => setExpandedImage(null)}>
            <div className="image-modal-content" onClick={e => e.stopPropagation()}>
              <button className="btn-close-modal" onClick={() => setExpandedImage(null)}>×</button>
              <img src={expandedImage} alt="Expandida" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= VIEW ADMIN =================
  return (
    <div className="app-admin">
      <header className="header-main">
        <div className="brand-zone" onClick={() => { setView('public'); setPublicTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <img src="https://i.imgur.com/eczLsJ5.png" alt="Logo Resplande" className="brand-logo-img" />
          <div className="brand-text-container">
            <h1 className="brand-name">RESPLANDE<span className="brand-sub">VEÍCULOS</span></h1>
          </div>
        </div>
        <button className="btn-admin-access" style={{display: 'block'}} onClick={() => { setView('public'); setPublicTab('home'); }}>Sair do Admin</button>
      </header>
      
      <nav className="admin-nav">
        <button className={adminTab === 'inicio' ? 'active' : ''} onClick={() => setAdminTab('inicio')}>Início</button>
        <button className={adminTab === 'novo_veiculo' ? 'active' : ''} onClick={() => { cancelarEdicaoVeiculo(); setAdminTab('novo_veiculo'); }}>Add Veículo</button>
        <button className={adminTab === 'meu_estoque' ? 'active' : ''} onClick={() => setAdminTab('meu_estoque')}>Meu Estoque</button>
        <button className={adminTab === 'videos' ? 'active' : ''} onClick={() => { cancelarEdicaoVideo(); setAdminTab('videos'); }}>Vídeos</button>
        <button className={adminTab === 'avaliacoes' ? 'active' : ''} onClick={() => setAdminTab('avaliacoes')}>Clientes</button>
        <button className={adminTab === 'institucional' ? 'active' : ''} onClick={() => setAdminTab('institucional')}>Institucional</button>
      </nav>

      <main className="admin-box">
        {adminTab === 'inicio' && (
          <div>
            <h3>Títulos, Links e Banners</h3>
            <label>Título: Header do Site</label>
            <input value={config?.hero_title || ''} onChange={e => setConfig({...config, hero_title: e.target.value})} />
            
            <label>Subtítulo do Header</label>
            <input value={config?.hero_subtitle || ''} onChange={e => setConfig({...config, hero_subtitle: e.target.value})} />
            
            <label>Título: Top Cars</label>
            <input value={config?.titulo_top_cars || ''} onChange={e => setConfig({...config, titulo_top_cars: e.target.value})} />
            
            <label>Título: Estoque Completo</label>
            <input value={config?.titulo_estoque || ''} onChange={e => setConfig({...config, titulo_estoque: e.target.value})} />
            
            <label>Título: Resplande Life (Vídeos)</label>
            <input value={config?.titulo_videos || ''} onChange={e => setConfig({...config, titulo_videos: e.target.value})} />
            
            <label>Título: Nossos Clientes</label>
            <input value={config?.titulo_clientes || ''} onChange={e => setConfig({...config, titulo_clientes: e.target.value})} />
            
            <label>Título: Institucional</label>
            <input value={config?.titulo_institucional || ''} onChange={e => setConfig({...config, titulo_institucional: e.target.value})} />

            <label style={{marginTop: '20px'}}>WhatsApp (Ex: 5585996359338)</label>
            <input value={config?.whatsapp || ''} onChange={e => setConfig({...config, whatsapp: e.target.value.replace(/\D/g, '')})} />
            
            <label>Link do Instagram</label>
            <input value={config?.instagram || ''} onChange={e => setConfig({...config, instagram: e.target.value})} />
            
            <label>Estatística "Veículos Vendidos"</label>
            <input type="number" value={config?.vendas_contador || 0} onChange={e => setConfig({...config, vendas_contador: Number(e.target.value)})} />
            
            <h3 style={{marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '20px'}}>Frases Motivacionais (Home)</h3>
            {[1,2,3,4,5].map(num => (
              <div key={`frase_${num}`} style={{marginBottom: '10px'}}>
                <input placeholder={`Frase ${num}`} value={config[`frase_${num}`] || ''} onChange={e => setConfig({...config, [`frase_${num}`]: e.target.value})} />
              </div>
            ))}

            <button className="btn-submit-car" onClick={salvarConfig} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Textos Globais'}</button>

            <h3 style={{marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '20px'}}>Adicionar Banners</h3>
            <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px'}}>Estes banners ficarão rolando antes da vitrine de carros.</p>
            <input type="file" accept="image/*" onChange={adicionarBanner} />
            {loading && <div style={{color: 'var(--accent-gold)'}}>Enviando banner...</div>}
            
            <div style={{display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '15px'}}>
              {Array.isArray(banners) && banners.map(b => (
                <div key={b.id} style={{position: 'relative', width: '150px', flexShrink: 0}}>
                  <img src={b.url} style={{width: '100%', borderRadius: '8px'}} />
                  <button onClick={() => deletarBanner(b.id)} style={{position: 'absolute', top: 5, right: 5, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>X</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'novo_veiculo' && (
          <form onSubmit={salvarVeiculo}>
            <h3 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              {editingId ? '✏️ Editando Veículo' : 'Cadastrar Veículo'}
              {editingId && <button type="button" onClick={cancelarEdicaoVeiculo} style={{background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: '12px'}}>Cancelar</button>}
            </h3>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
              <div>
                <label>Marca</label>
                <select value={form.marca || ''} onChange={e => setForm({...form, marca: e.target.value})} required className="select-sleek">
                  <option value="">Selecione...</option>
                  {TODAS_AS_MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label>Ano do Modelo</label>
                <select value={form.fabricacao || ''} onChange={e => setForm({...form, fabricacao: e.target.value})} required className="select-sleek">
                  <option value="">Selecione...</option>
                  {ANOS_OPCOES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <label>Modelo (Texto Maiúsculo automático)</label>
            <input placeholder="Ex: C3 FEEL PACK AUTOMÁTICO" value={form.modelo || ''} onChange={e => setForm({...form, modelo: e.target.value.toUpperCase()})} required style={{textTransform: 'uppercase'}} />
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
              <div>
                <label>KM</label>
                <input placeholder="Ex: 12000" value={form.km || ''} onChange={e => setForm({...form, km: e.target.value})} required />
              </div>
              <div>
                <label>Combustível</label>
                <select value={form.combustivel || 'Flex'} onChange={e => setForm({...form, combustivel: e.target.value})} className="select-sleek" style={{padding: '12px'}}>
                  <option value="Flex">Flex</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Elétrico">Elétrico</option>
                </select>
              </div>
              <div>
                <label>Câmbio</label>
                <select value={form.cambio || 'Automático'} onChange={e => setForm({...form, cambio: e.target.value})} className="select-sleek" style={{padding: '12px'}}>
                  <option value="Automático">Auto</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
            </div>
            
            <div>
              <label>Categoria da Carroceria</label>
              <select value={form.tipo_carro || 'Hatch'} onChange={e => setForm({...form, tipo_carro: e.target.value})} className="select-sleek" style={{padding: '12px'}}>
                {TIPOS_CARRO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px'}}>
              <div>
                <label>Preço Ofertado (R$)</label>
                <input placeholder="0,00" value={form.preco || ''} onChange={e => handlePrecoChange(e.target.value, 'preco')} required />
              </div>
              <div>
                <label>Preço Antigo - Opcional</label>
                <input placeholder="0,00" value={form.preco_antigo || ''} onChange={e => handlePrecoChange(e.target.value, 'preco_antigo')} />
              </div>
            </div>

            <div style={{background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', margin: '20px 0'}}>
              <label style={{color: 'var(--accent-gold)', marginBottom: '10px'}}>Diferenciais e Tags</label>
              
              <div className="checkbox-row">
                <input type="checkbox" checked={form.unico_dono || false} onChange={e => setForm({...form, unico_dono: e.target.checked})} />
                <label>Único Dono</label>
              </div>
              
              <div className="checkbox-row">
                <input type="checkbox" checked={form.revisoes_concessionaria || false} onChange={e => setForm({...form, revisoes_concessionaria: e.target.checked})} />
                <label>Revisões em Concessionária</label>
              </div>
              
              <div className="checkbox-row">
                <input type="checkbox" checked={form.laudo_cautelar || false} onChange={e => setForm({...form, laudo_cautelar: e.target.checked})} />
                <label>Laudo Cautelar Aprovado</label>
              </div>
              
              <div className="checkbox-row">
                <input type="checkbox" checked={form.ipva_pago || false} onChange={e => setForm({...form, ipva_pago: e.target.checked})} />
                <label>IPVA Pago</label>
              </div>
              
              <div className="checkbox-row" style={{marginBottom: 0, marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px'}}>
                <input type="checkbox" checked={form.blindado || false} onChange={e => setForm({...form, blindado: e.target.checked})} />
                <label>Blindado (Aparece na Foto)</label>
              </div>
            </div>
            
            <label style={{color: 'var(--accent-gold)', fontWeight: 'bold'}}>Mídia (Fotos e Vídeos)</label>
            {editingId && <p style={{fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px'}}>Vazio mantém as originais.</p>}
            
            <input type="file" multiple accept="image/*,video/*" onChange={e => setArquivos(Array.from(e.target.files || []))} />
            
            {loading && uploadProgress > 0 && (
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            
            <button type="submit" className="btn-submit-car" disabled={loading}>
              {loading ? 'Salvando...' : (editingId ? 'Atualizar Veículo' : 'Publicar Veículo')}
            </button>
          </form>
        )}

        {adminTab === 'meu_estoque' && (
          <div>
            <h3>Gerenciar Estoque</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              {Array.isArray(veiculos) && veiculos.map(v => (
                <div key={v.id} style={{background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px'}}>
                   {Array.isArray(v.galeria) && v.galeria[0] ? (
                     <div style={{width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0}}>
                       {v.galeria[0].tipo === 'foto' ? (
                         <img src={v.galeria[0].url} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                       ) : (
                         <video src={`${v.galeria[0].url}#t=0.001`} preload="metadata" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                       )}
                     </div>
                   ) : (
                     <div style={{width: '60px', height: '60px', background: '#000', borderRadius: '4px', flexShrink: 0}} />
                   )}
                   
                   <div style={{flex: 1}}>
                     <strong style={{color: 'var(--text-primary)', display: 'block', fontSize: '14px', textTransform: 'uppercase'}}>{v.marca} {v.modelo}</strong>
                     <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>R$ {v.preco}</span>
                   </div>
                   
                   <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                     {v.preco_antigo && (
                       <button onClick={() => togglePromocao(v.id!, v.em_promocao || false)} style={{background: v.em_promocao ? 'transparent' : 'var(--accent-gold)', color: v.em_promocao ? 'var(--bg-pure)' : 'var(--text-primary)', border: `1px solid var(--accent-gold)`, padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'}}>
                         {v.em_promocao ? '❌ Tirar Promo' : '🎁 Dar Promo'}
                       </button>
                     )}
                     <button onClick={() => prepararEdicaoVeiculo(v)} style={{background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'}}>✏️ Editar</button>
                     <select value={v.status || ''} onChange={(e) => atualizarStatusVeiculo(v.id!, e.target.value)} style={{padding: '6px', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '11px'}}>
                       <option value="Disponível">Disponível</option>
                       <option value="Oculto">Ocultar</option>
                       <option value="Vendido">Vendido</option>
                     </select>
                     <button onClick={() => deletarVeiculo(v.id!)} style={{background: 'var(--danger)', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'}}>🗑️ Excluir</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'videos' && (
          <div>
            <h3>Resplande Life (Vlogs/Detalhes)</h3>
            <form onSubmit={salvarVideoGaleria} style={{background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '30px'}}>
              <h3 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: editingVideoId ? 'var(--accent-gold)' : 'var(--text-primary)', fontSize: '14px'}}>
                {editingVideoId ? '✏️ Editando Vídeo' : 'Adicionar Vídeo'}
                {editingVideoId && <button type="button" onClick={cancelarEdicaoVideo} style={{background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: '12px'}}>Cancelar</button>}
              </h3>
              
              <label>Título</label>
              <input value={vidForm.titulo || ''} onChange={e => setVidForm({...vidForm, titulo: e.target.value})} required placeholder="Título Chamativo" />
              
              <label>Descrição</label>
              <textarea value={vidForm.descricao || ''} onChange={e => setVidForm({...vidForm, descricao: e.target.value})} rows={2} placeholder="Curto texto..." />
              
              <label style={{color: 'var(--accent-gold)'}}>Arquivo de Vídeo</label>
              {editingVideoId && <p style={{fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px'}}>Vazio mantém o atual.</p>}
              
              <input type="file" accept="video/*" onChange={e => setVidForm({...vidForm, file: e.target.files?.[0] || null})} required={!editingVideoId} />
              
              {loading && uploadProgress > 0 && (
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              
              <button type="submit" className="btn-submit-car" disabled={loading}>
                {loading ? 'Salvando...' : (editingVideoId ? 'Atualizar' : 'Subir')}
              </button>
            </form>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '15px'}}>
              {Array.isArray(videosGaleria) && videosGaleria.map(vid => (
                <div key={vid.id} style={{position: 'relative', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-deep)'}}>
                  <video src={`${vid.url}#t=0.001`} preload="metadata" style={{width: '100%', height: '180px', objectFit: 'cover', display: 'block'}} />
                  <div style={{padding: '10px'}}>
                    <strong style={{color: 'var(--accent-gold)', display: 'block', fontSize: '14px', textTransform: 'uppercase'}}>{vid.titulo}</strong>
                    <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px'}}>{vid.descricao}</p>
                  </div>
                  <div style={{position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '5px'}}>
                    <button onClick={() => prepararEdicaoVideo(vid)} style={{background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', fontSize: '10px'}}>Editar</button>
                    <button onClick={() => deletarVideo(vid.id)} style={{background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px'}}>Apagar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'avaliacoes' && (
          <div>
            <h3>Gerenciar Avaliações</h3>
            <form onSubmit={e => enviarAvaliacao(e, true)} style={{background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '30px'}}>
              <input placeholder="Nome" value={pubReview.nome || ''} onChange={e => setPubReview({...pubReview, nome: e.target.value})} required />
              
              <textarea placeholder="Depoimento..." value={pubReview.texto || ''} onChange={e => setPubReview({...pubReview, texto: e.target.value})} required rows={3} />
              
              <label style={{fontSize: '12px', color: 'var(--accent-gold)', display: 'block', marginBottom: '5px'}}>Envie seu momento conosco (Foto do Cliente)</label>
              <input type="file" accept="image/*" onChange={e => setPubReviewFile(e.target.files?.[0] || null)} />
              
              {loading && uploadProgress > 0 && (
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              
              <button type="submit" className="btn-submit-car" disabled={loading}>
                {loading ? 'Salvando...' : 'Publicar'}
              </button>
            </form>
            
            {Array.isArray(avaliacoes) && avaliacoes.map(a => (
              <div key={a.id} style={{background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--border-color)', display: 'flex', gap: '15px'}}>
                {a.foto_url && <img src={a.foto_url} style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}} />}
                <div style={{flex: 1}}>
                  <strong style={{color: 'var(--text-primary)', display: 'block'}}>{a.nome}</strong>
                  <p style={{fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'justify'}}>&quot;{a.texto}&quot;</p>
                  <span style={{fontSize: '10px', color: a.aprovado ? '#25D366' : 'var(--danger)'}}>{a.aprovado ? 'APROVADA' : 'AGUARDANDO'}</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                  {!a.aprovado && (
                    <button onClick={() => aprovarAvaliacao(a.id)} style={{background: '#25D366', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', fontSize: '10px'}}>Aprovar</button>
                  )}
                  <button onClick={() => deletarAvaliacao(a.id)} style={{background: 'var(--danger)', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', fontSize: '10px'}}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {adminTab === 'institucional' && (
          <div>
            <h3>Sessão Institucional</h3>
            {[1,2,3,4].map(num => (
              <div key={num} style={{background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--border-color)'}}>
                <label>Retângulo {num}</label>
                <input value={config[`secao_${num}_titulo`] || ''} onChange={e => setConfig({...config, [`secao_${num}_titulo`]: e.target.value})} style={{background: 'var(--bg-input)'}} />
                <textarea value={config[`secao_${num}_texto`] || ''} onChange={e => setConfig({...config, [`secao_${num}_texto`]: e.target.value})} style={{background: 'var(--bg-input)'}} />
              </div>
            ))}
            <button className="btn-submit-car" onClick={salvarConfig} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Textos'}</button>
          </div>
        )}
      </main>
    </div>
  );
}