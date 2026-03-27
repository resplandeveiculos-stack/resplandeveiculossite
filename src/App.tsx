import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

interface Midia { tipo: 'foto' | 'video'; url: string; }
interface Veiculo { 
  id?: number; marca: string; modelo: string; fabricacao: string; km: string; preco: string; 
  status: 'Disponível' | 'Vendido' | 'Oculto'; galeria: Midia[]; unico_dono: boolean;
  blindado?: boolean; laudo_cautelar?: boolean; ipva_pago?: boolean; revisoes_concessionaria?: boolean;
  preco_antigo?: string; em_promocao?: boolean; combustivel?: string; cambio?: string; tipo_carro?: string;
  destaque?: boolean;
}
interface Avaliacao { id: number; nome: string; texto: string; foto_url: string; aprovado: boolean; created_at?: string; }
interface VideoGaleria { id: number; url: string; titulo: string; descricao: string; }
interface Banner { id: number; url: string; }

const TODAS_AS_MARCAS = ['Audi', 'BMW', 'BYD', 'Caoa Chery', 'Chevrolet', 'Citroën', 'Fiat', 'Ford', 'GWM', 'Honda', 'Hyundai', 'Jeep', 'Kia', 'Land Rover', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Peugeot', 'Porsche', 'Renault', 'Suzuki', 'Toyota', 'Volkswagen', 'Volvo'].sort();
// Anos de 2026 até 2000
const ANOS_OPCOES = Array.from({length: 27}, (_, i) => String(2026 - i));
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
    whatsapp: "5585996359338"
  });

  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroPreco, setFiltroPreco] = useState('');
  const [filtroKm, setFiltroKm] = useState('');
  const [filtroCombustivel, setFiltroCombustivel] = useState('');
  const [filtroCambio, setFiltroCambio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const [expandedGallery, setExpandedGallery] = useState<{ imagens: Midia[], index: number } | null>(null);
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [pubReview, setPubReview] = useState({ nome: '', texto: '' });
  const [pubReviewFile, setPubReviewFile] = useState<File | null>(null);

  const [publicTab, setPublicTab] = useState<'home' | 'estoque' | 'vender' | 'avaliacoes'>('home');
  const [formVender, setFormVender] = useState({ ano: '', modelo: '', versao: '', cor: '', combustivel: 'Gasolina', km: '', valor: '' });

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

  // Verifica se a URL tem um link direto de carro ao carregar a página
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const carroId = urlParams.get('carro');
    if (carroId) {
      setPublicTab('estoque');
      setTimeout(() => {
        const el = document.getElementById(`carro-${carroId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-car');
          setTimeout(() => el.classList.remove('highlight-car'), 3000);
        }
      }, 1000);
    }
  }, [veiculos]);

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

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return '';
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

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

  const veiculosDestaque = veiculosFiltrados.filter(v => v.destaque);
  const veiculosExibidos = publicTab === 'estoque' 
    ? veiculosFiltrados 
    : (veiculosDestaque.length > 0 ? veiculosDestaque.slice(0, 3) : veiculosFiltrados.slice(0, 3));
  
  const avaliacoesAprovadas = Array.isArray(avaliacoes) ? avaliacoes.filter(a => a.aprovado) : [];
  const avaliacoesHome = avaliacoesAprovadas.filter(a => a.texto && a.texto.trim().length > 0);

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

  // FUNÇÃO DE COMPARTILHAR AVIÃOZINHO
  const handleShare = (v: Veiculo) => {
    const url = `${window.location.origin}?carro=${v.id}`;
    const msg = encodeURIComponent(`Olha esse carro na Resplande Veículos!\n\n🚘 *${v.marca} ${v.modelo}*\n📅 Ano: ${v.fabricacao}\n💰 *R$ ${v.preco}*\n\nVeja as fotos clicando no link abaixo:\n${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
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
    setForm({ ...v, galeria: v.galeria || [] }); setEditingId(v.id || null); setAdminTab('novo_veiculo'); setArquivos([]); 
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

  // GERENCIAMENTO DA GALERIA NO ADMIN
  const removerMidiaGaleria = (index: number) => {
    const nova = [...(form.galeria || [])];
    nova.splice(index, 1);
    setForm({ ...form, galeria: nova });
  };

  const moverMidiaGaleria = (index: number, direcao: number) => {
    const nova = [...(form.galeria || [])];
    if (index + direcao < 0 || index + direcao >= nova.length) return;
    const temp = nova[index];
    nova[index] = nova[index + direcao];
    nova[index + direcao] = temp;
    setForm({ ...form, galeria: nova });
  };

  const salvarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (arquivos.length === 0 && (!form.galeria || form.galeria.length === 0)) { 
      alert("Selecione pelo menos uma foto!"); return; 
    }
    
    setLoading(true); setUploadProgress(10);
    let novaGaleria = [...(form.galeria || [])]; 
    if (arquivos.length > 0) {
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
  
  const toggleDestaque = async (v: Veiculo) => {
    const statusDestaqueAtual = v.destaque || false;
    if (!statusDestaqueAtual) {
      const currentDestaques = veiculos.filter(car => car.destaque).length;
      if (currentDestaques >= 3) {
        alert("Você já tem 3 carros em destaque na Home! Remova a estrela de algum carro para destacar este.");
        return;
      }
    }
    await supabase.from('veiculos').update({ destaque: !statusDestaqueAtual }).eq('id', v.id); 
    fetchVeiculos();
  };

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
      await supabase.from('galeria_videos').update(payload).eq('id', editingVideoId); 
    } else { 
      await supabase.from('galeria_videos').insert([payload]); 
    }
    alert("Salvo!"); cancelarEdicaoVideo(); fetchVideos(); setLoading(false); setUploadProgress(0);
  };
  const deletarVideo = async (id: number) => { if(window.confirm("Apagar vídeo?")) { await supabase.from('galeria_videos').delete().eq('id', id); fetchVideos(); } };

  const adicionarBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return; setLoading(true);
    const url = await uploadMidiaSingle(file);
    if(url) { await supabase.from('banners').insert([{ url }]); fetchBanners(); }
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
  
  const handlePrecoChange = (val: string, field: string, formObj: any, setFormObj: any) => { 
    setFormObj({ ...formObj, [field]: formatCurrencyBR(val) }); 
  };
  
  const salvarConfig = async () => { 
    setLoading(true); 
    const { id, updated_at, brand_name, brand_sub, endereco, historia, ...configToSave } = config; 
    await supabase.from('site_config').update(configToSave).eq('id', 1); 
    alert("Alterações salvas!"); fetchConfig(); setLoading(false); 
  };

  const handleLogoClick = () => {
    setView('public');
    setPublicTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminAccess = () => {
    const pwd = window.prompt("Digite a senha de acesso restrito:");
    if (pwd === "bmw26volvo") {
      setView('admin');
      window.scrollTo(0,0);
    } else if (pwd !== null) {
      alert("Senha incorreta.");
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(expandedGallery) { setExpandedGallery({ ...expandedGallery, index: (expandedGallery.index + 1) % expandedGallery.imagens.length }); }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(expandedGallery) { setExpandedGallery({ ...expandedGallery, index: (expandedGallery.index - 1 + expandedGallery.imagens.length) % expandedGallery.imagens.length }); }
  };

  const HeaderLogo = () => (
    <div className="brand-zone" onClick={handleLogoClick}>
      <img 
        src={theme === 'light' ? "https://i.imgur.com/y4y83I7.png" : "https://i.imgur.com/ehdr4XT.png"} 
        alt="Logo Resplande" 
        className="brand-logo-img" 
      />
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
            <a href="#vender" onClick={(e) => { e.preventDefault(); setPublicTab('vender'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Vender</a>
            <a href="#avaliacoes" onClick={(e) => { e.preventDefault(); setPublicTab('avaliacoes'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Avaliações</a>
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
              <svg viewBox="0 0 24 24" width="35" height="35" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            </button>
          </div>
        </header>

        {isMobileMenuOpen && (
          <nav className="mobile-dropdown-menu">
            <a href="#inicio" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('home'); window.scrollTo(0,0); }}>Início</a>
            <a href="#estoque" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('estoque'); window.scrollTo(0,0); }}>Estoque</a>
            <a href="#vender" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('vender'); window.scrollTo(0,0); }}>Vender Veículo</a>
            <a href="#avaliacoes" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setPublicTab('avaliacoes'); window.scrollTo(0,0); }}>Avaliações</a>
          </nav>
        )}

        <main className="content-main">

          {/* ================= TELA: VENDER VEÍCULO ================= */}
          {publicTab === 'vender' && (
            <section className="filter-panel-refined" style={{textAlign: 'center'}}>
              <h2 className="sec-title">Venda seu Veículo</h2>
              <form onSubmit={(e) => { e.preventDefault(); const msg = encodeURIComponent(`Olá! Quero vender meu veículo.\nAno: ${formVender.ano}\nModelo: ${formVender.modelo}\nVersão: ${formVender.versao}\nCor: ${formVender.cor}\nCombustível: ${formVender.combustivel}\nKM: ${formVender.km}\nValor Pretendido: R$ ${formVender.valor}`); window.open(getWhatsAppLink(msg), '_blank'); }} className="public-review-form" style={{ textAlign: 'left' }}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                  <div><label>Ano</label><input placeholder="Ex: 2022" value={formVender.ano} onChange={e => setFormVender({...formVender, ano: e.target.value})} required /></div>
                  <div><label>Cor</label><input placeholder="Ex: Branco" value={formVender.cor} onChange={e => setFormVender({...formVender, cor: e.target.value})} required /></div>
                </div>
                <label>Modelo</label><input placeholder="Ex: Corolla" value={formVender.modelo} onChange={e => setFormVender({...formVender, modelo: e.target.value})} required />
                <label>Versão</label><input placeholder="Ex: XEI 2.0" value={formVender.versao} onChange={e => setFormVender({...formVender, versao: e.target.value})} required />
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                  <div><label>KM</label><input placeholder="Ex: 45000" value={formVender.km} onChange={e => setFormVender({...formVender, km: e.target.value})} required /></div>
                  <div><label>Combustível</label><select value={formVender.combustivel} onChange={e => setFormVender({...formVender, combustivel: e.target.value})} className="select-sleek"><option value="Gasolina">Gasolina</option><option value="Diesel">Diesel</option><option value="Flex">Flex</option><option value="Elétrico">Elétrico</option><option value="Híbrido">Híbrido</option></select></div>
                </div>
                <label>Valor Pretendido (R$)</label><input placeholder="Ex: 120.000,00" value={formVender.valor} onChange={e => handlePrecoChange(e.target.value, 'valor', formVender, setFormVender)} />
                <button type="submit" className="btn-avaliar-primary" style={{marginTop:'25px'}}>📲 Enviar para WhatsApp</button>
              </form>
            </section>
          )}

          {/* ================= TELA: AVALIAÇÕES ================= */}
          {publicTab === 'avaliacoes' && (
            <>
              <h2 className="sec-title" style={{ marginTop: '20px' }}>{config?.titulo_clientes || "NOSSOS CLIENTES"}</h2>
              <div className="avaliacoes-grid">
                {avaliacoesAprovadas.map(a => (
                  <div key={a.id} className="avaliacao-card-full">
                     <div className="avaliacao-perfil">
                        {a.foto_url ? <img src={a.foto_url} className="avaliacao-img" onClick={() => setExpandedGallery({ imagens: [{ tipo: 'foto', url: a.foto_url }], index: 0 })} /> : <div className="no-photo-cliente-small">🚗</div>}
                        <div className="avaliacao-info"><strong>{a.nome}</strong><span>{formatarData(a.created_at)}</span></div>
                     </div>
                     {a.texto && <p className="avaliacao-texto">&quot;{a.texto}&quot;</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ================= TELA: ESTOQUE (FILTROS) ================= */}
          {publicTab === 'estoque' && (
            <section className="filter-panel-refined">
              <div className="filter-grid-6">
                <select value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)} className="select-sleek"><option value="">Todas Marcas</option>{TODAS_AS_MARCAS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="select-sleek"><option value="">Todos Anos</option>{ANOS_OPCOES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                <select value={filtroPreco} onChange={e => setFiltroPreco(e.target.value)} className="select-sleek"><option value="">Qualquer Preço</option><option value="ate-60k">Até R$ 60 mil</option><option value="60k-100k">R$ 60k a 100k</option><option value="100k-150k">R$ 100k a 150k</option><option value="acima-150k">Acima R$ 150 mil</option></select>
                <select value={filtroKm} onChange={e => setFiltroKm(e.target.value)} className="select-sleek"><option value="">Qualquer KM</option><option value="ate-30k">Até 30.000 km</option><option value="30k-60k">30k a 60k</option><option value="acima-60k">Acima de 60k</option></select>
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="select-sleek"><option value="">Categorias</option>{TIPOS_CARRO.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              {(filtroMarca || filtroAno || filtroPreco || filtroKm || filtroTipo) && (
                <button className="btn-clear-filters" onClick={() => { setFiltroMarca(''); setFiltroAno(''); setFiltroPreco(''); setFiltroKm(''); setFiltroTipo(''); }}>Limpar Filtros</button>
              )}
            </section>
          )}

          {/* ================= HOME E ESTOQUE (VITRINE) ================= */}
          {(publicTab === 'home' || publicTab === 'estoque') && (
            <>
              {publicTab === 'home' && (
                <section className="hero-section">
                  <h2>{config?.hero_title}</h2>
                  <p className="hero-subtitle">{config?.hero_subtitle}</p>
                  {banners.length > 0 && <div className="banners-carousel" ref={bannersRef}>{banners.map(b => <div key={b.id} className="banner-slide"><img src={b.url} /></div>)}</div>}
                </section>
              )}

              <h2 className="sec-title">{publicTab === 'estoque' ? config?.titulo_estoque : config?.titulo_top_cars}</h2>
              <div className="car-grid">
                {veiculosExibidos.map(v => (
                  <div key={v.id} id={`carro-${v.id}`} className={`car-card ${publicTab === 'home' ? 'card-compact' : ''}`}>
                    <div className="car-media-slider">
                      {v.blindado && <div className="badge-blindado">🛡️ BLINDADO</div>}
                      <div className="media-scroller">
                        {v.galeria?.map((m, i) => (
                           <div key={i} className="media-slide">
                             {m.tipo === 'video' ? <video src={`${m.url}#t=0.001`} controls className="media-real-img" /> : <img src={m.url} className="media-real-img clickable-img" onClick={() => setExpandedGallery({ imagens: v.galeria, index: i })} />}
                           </div>
                        ))}
                      </div>
                      {v.galeria?.length > 1 && <div className="swipe-hint">deslize ➔</div>}
                    </div>
                    
                    <div className="car-details">
                      <span className="car-marca-label">{v.marca}</span>
                      <h3 className="car-model-title">{v.modelo}</h3>
                      <div className="car-meta"><span>{v.fabricacao}</span><span className="separator">|</span><span>{v.km} km</span><span className="separator">|</span><span>{v.combustivel}</span><span className="separator">|</span><span>{v.tipo_carro}</span></div>
                      
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
                        <div style={{display: 'flex', gap: '8px'}}>
                           <button className="btn-share" onClick={() => handleShare(v)} aria-label="Compartilhar WhatsApp">
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                           </button>
                           <button className="btn-interesse" onClick={() => handleInteresse(v)}>Interesse</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {publicTab === 'home' && (
                <div style={{textAlign: 'center', margin: '50px 0'}}>
                  <button className="btn-estoque-completo" onClick={() => { setPublicTab('estoque'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>VEJA NOSSO ESTOQUE COMPLETO ➔</button>
                </div>
              )}
            </>
          )}

          {/* SESSÕES EXTRAS DA HOME */}
          {publicTab === 'home' && (
            <>
              {videosGaleria.length > 0 && (
                <section className="sec-videos">
                  <h2 className="sec-title">{config?.titulo_videos}</h2>
                  <div className="videos-carousel">
                    {videosGaleria.map(vid => (
                      <div key={vid.id} className="video-card-slide">
                        <video src={`${vid.url}#t=0.001`} controls className="video-player-public" />
                        <div className="video-info"><h4>{vid.titulo}</h4><p>{vid.descricao}</p></div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="sec-entregas">
                <h2 className="sec-title">{config?.titulo_clientes}</h2>
                <div className="entregas-carousel" ref={carouselRef}>
                  {avaliacoesHome.map(a => (
                    <div key={a.id} className="entrega-card-slide">
                      {a.foto_url ? <img src={a.foto_url} className="entrega-img" onClick={() => setExpandedGallery({ imagens: [{ tipo: 'foto', url: a.foto_url }], index: 0 })} /> : <div className="no-photo-cliente">🚗</div>}
                      <div className="entrega-overlay">
                        <p className="entrega-depoimento">&quot;{a.texto}&quot;</p>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '5px'}}>
                          <span className="entrega-cliente">— {a.nome}</span>
                          <span className="entrega-data">{formatarData(a.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="avaliacoes-actions">
                  <button className="btn-avaliar-primary" onClick={() => setShowReviewForm(!showReviewForm)}>
                    {showReviewForm ? 'Cancelar Avaliação' : 'Deixar minha avaliação'}
                  </button>
                  <button className="btn-avaliar-secondary" onClick={() => { setPublicTab('avaliacoes'); window.scrollTo(0,0); }}>Ver todas as avaliações ➔</button>
                </div>
                {showReviewForm && (
                  <form onSubmit={e => enviarAvaliacao(e, false)} className="public-review-form">
                    <input placeholder="Seu Nome" value={pubReview.nome} onChange={e => setPubReview({...pubReview, nome: e.target.value})} required />
                    <textarea placeholder="Sua experiência" value={pubReview.texto} onChange={e => setPubReview({...pubReview, texto: e.target.value})} required rows={3} />
                    <label>Sua Foto com a Nave (Opcional)</label>
                    <input type="file" accept="image/*" onChange={e => setPubReviewFile(e.target.files?.[0] || null)} />
                    <button type="submit" className="btn-avaliar-primary" disabled={loading}>{loading ? 'Enviando...' : 'Enviar Avaliação'}</button>
                  </form>
                )}
              </section>

              <section className="motivational-panel">
                <h3 className="motivational-quotes">&quot;</h3>
                <p className="motivational-text">{frasesAtivasCarousel[fraseAtiva % frasesAtivasCarousel.length]}</p>
              </section>
            </>
          )}
        </main>
        
        <div className="floating-buttons">
          <a href={getWhatsAppLink()} className="fab-wpp" target="_blank" rel="noreferrer"><svg viewBox="0 0 24 24" width="30" height="30"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"/></svg></a>
        </div>

        {expandedGallery && expandedGallery.imagens.length > 0 && (
          <div className="image-modal-overlay" onClick={() => setExpandedGallery(null)}>
            <div className="image-modal-content" onClick={e => e.stopPropagation()}>
              <button className="btn-close-modal" onClick={() => setExpandedGallery(null)}>×</button>
              {expandedGallery.imagens.length > 1 && <button className="modal-nav-btn modal-prev" onClick={prevImage}>&#10094;</button>}
              {expandedGallery.imagens[expandedGallery.index].tipo === 'video' ? <video src={expandedGallery.imagens[expandedGallery.index].url} controls autoPlay className="modal-media-item" /> : <img src={expandedGallery.imagens[expandedGallery.index].url} className="modal-media-item" />}
              {expandedGallery.imagens.length > 1 && <button className="modal-nav-btn modal-next" onClick={nextImage}>&#10095;</button>}
            </div>
          </div>
        )}
        <footer className="footer-main">
           <p>© {new Date().getFullYear()} Resplande Veículos. Todos os direitos reservados.</p>
           <button onClick={handleAdminAccess} className="btn-hidden-admin">Acesso Restrito</button>
        </footer>
      </div>
    );
  }

  // ================= VIEW ADMIN =================
  return (
    <div className="app-admin">
      <header className="header-main">
        <HeaderLogo />
        <button className="btn-admin-access" onClick={() => { setView('public'); setPublicTab('home'); }}>Sair do Admin</button>
      </header>
      
      <nav className="admin-nav">
        <button className={adminTab === 'inicio' ? 'active' : ''} onClick={() => setAdminTab('inicio')}>Início</button>
        <button className={adminTab === 'novo_veiculo' ? 'active' : ''} onClick={() => { cancelarEdicaoVeiculo(); setAdminTab('novo_veiculo'); }}>Add Veículo</button>
        <button className={adminTab === 'meu_estoque' ? 'active' : ''} onClick={() => setAdminTab('meu_estoque')}>Meu Estoque</button>
        <button className={adminTab === 'videos' ? 'active' : ''} onClick={() => { cancelarEdicaoVideo(); setAdminTab('videos'); }}>Vídeos</button>
        <button className={adminTab === 'avaliacoes' ? 'active' : ''} onClick={() => setAdminTab('avaliacoes')}>Clientes</button>
      </nav>

      <main className="admin-box">
        {adminTab === 'inicio' && (
          <div>
            <h3>Títulos do Site e Configurações</h3>
            <input placeholder="Título Header" value={config?.hero_title} onChange={e => setConfig({...config, hero_title: e.target.value})} />
            <input placeholder="Subtítulo Header" value={config?.hero_subtitle} onChange={e => setConfig({...config, hero_subtitle: e.target.value})} />
            <input placeholder="WhatsApp" value={config?.whatsapp} onChange={e => setConfig({...config, whatsapp: e.target.value.replace(/\D/g, '')})} />
            
            <h3 style={{marginTop:'30px', paddingTop:'15px', borderTop:'1px solid var(--border-color)'}}>Frases Motivacionais</h3>
            {[1,2,3,4,5].map(n => <input key={n} placeholder={`Frase ${n}`} value={config[`frase_${n}`] || ''} onChange={e => setConfig({...config, [`frase_${n}`]: e.target.value})} />)}
            
            <button className="btn-submit-car" onClick={salvarConfig} disabled={loading}>Salvar Textos</button>
            
            <h3 style={{marginTop:'30px', paddingTop:'15px', borderTop:'1px solid var(--border-color)'}}>Banners (Rotativos na Home)</h3>
            <input type="file" accept="image/*" onChange={adicionarBanner} />
            <div style={{display:'flex', gap:'10px', overflowX:'auto', marginTop:'15px'}}>
              {banners.map(b => (
                <div key={b.id} style={{position:'relative', width:'150px', flexShrink:0}}>
                  <img src={b.url} style={{width:'100%', borderRadius:'8px'}} />
                  <button onClick={() => deletarBanner(b.id)} style={{position:'absolute', top:5, right:5, background:'var(--danger)', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer'}}>X</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'novo_veiculo' && (
          <form onSubmit={salvarVeiculo}>
            <h3 style={{display:'flex', justifyContent:'space-between'}}>
              {editingId ? 'Editando Veículo' : 'Cadastrar Veículo'}
              {editingId && <button type="button" onClick={cancelarEdicaoVeiculo} style={{background:'none', color:'var(--danger)', border:'none', cursor:'pointer'}}>Cancelar</button>}
            </h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
              <select value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} required className="select-sleek"><option value="">Marca</option>{TODAS_AS_MARCAS.map(m => <option key={m} value={m}>{m}</option>)}</select>
              <select value={form.fabricacao} onChange={e => setForm({...form, fabricacao: e.target.value})} required className="select-sleek"><option value="">Ano</option>{ANOS_OPCOES.map(a => <option key={a} value={a}>{a}</option>)}</select>
            </div>
            <input placeholder="Modelo Completo" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value.toUpperCase()})} required style={{textTransform:'uppercase'}} />
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px'}}>
              <input placeholder="KM" value={form.km} onChange={e => setForm({...form, km: e.target.value})} required />
              <select value={form.combustivel} onChange={e => setForm({...form, combustivel: e.target.value})} className="select-sleek"><option value="Flex">Flex</option><option value="Gasolina">Gasolina</option><option value="Diesel">Diesel</option><option value="Elétrico">Elétrico</option></select>
              <select value={form.cambio} onChange={e => setForm({...form, cambio: e.target.value})} className="select-sleek"><option value="Automático">Auto</option><option value="Manual">Manual</option></select>
            </div>
            <select value={form.tipo_carro} onChange={e => setForm({...form, tipo_carro: e.target.value})} className="select-sleek"><option value="Hatch">Hatch</option><option value="Sedan">Sedan</option><option value="SUV">SUV</option><option value="Picape">Picape</option></select>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
              <input placeholder="Preço" value={form.preco} onChange={e => handlePrecoChange(e.target.value, 'preco', form, setForm)} required />
              <input placeholder="Preço Antigo (Opcional)" value={form.preco_antigo} onChange={e => handlePrecoChange(e.target.value, 'preco_antigo', form, setForm)} />
            </div>

            <div style={{background:'var(--bg-input)', padding:'15px', borderRadius:'8px', border:'1px solid var(--border-color)', margin:'15px 0'}}>
              <label style={{color:'var(--accent-gold)'}}>Diferenciais</label>
              {['unico_dono', 'revisoes_concessionaria', 'laudo_cautelar', 'ipva_pago', 'blindado'].map(tag => (
                <div key={tag} className="checkbox-row">
                  <input type="checkbox" checked={form[tag as keyof Veiculo] as boolean || false} onChange={e => setForm({...form, [tag]: e.target.checked})} />
                  <label>{tag.replace('_', ' ').toUpperCase()}</label>
                </div>
              ))}
            </div>

            {/* GERENCIADOR DE FOTOS ANTIGAS */}
            {form.galeria && form.galeria.length > 0 && (
              <div style={{background:'var(--bg-input)', padding:'10px', borderRadius:'8px', marginBottom:'15px'}}>
                <label style={{color:'var(--accent-gold)', fontSize:'11px', display:'block', marginBottom:'10px'}}>Fotos Salvas (Arraste para apagar ou reordenar)</label>
                <div style={{display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'10px'}}>
                  {form.galeria.map((m, idx) => (
                    <div key={idx} style={{position:'relative', width:'90px', height:'90px', flexShrink:0, borderRadius:'8px', overflow:'hidden', border:'1px solid var(--border-color)'}}>
                      {m.tipo === 'video' ? <video src={m.url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <img src={m.url} style={{width:'100%', height:'100%', objectFit:'cover'}} />}
                      <div style={{position:'absolute', bottom:0, left:0, width:'100%', display:'flex', justifyContent:'space-between', background:'rgba(0,0,0,0.8)', padding:'2px 5px'}}>
                        <button type="button" onClick={() => moverMidiaGaleria(idx, -1)} disabled={idx === 0} style={{color:'white', background:'none', border:'none', cursor:'pointer'}}>&lt;</button>
                        <button type="button" onClick={() => removerMidiaGaleria(idx)} style={{color:'var(--danger)', background:'none', border:'none', cursor:'pointer'}}>X</button>
                        <button type="button" onClick={() => moverMidiaGaleria(idx, 1)} disabled={idx === form.galeria.length - 1} style={{color:'white', background:'none', border:'none', cursor:'pointer'}}>&gt;</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label style={{color:'var(--accent-gold)'}}>Adicionar Novas Fotos/Vídeos</label>
            <input type="file" multiple accept="image/*,video/*" onChange={e => setArquivos(Array.from(e.target.files || []))} />
            
            {loading && <div className="progress-bar-container"><div className="progress-bar-fill" style={{width: `${uploadProgress}%`}} /></div>}
            <button type="submit" className="btn-submit-car" disabled={loading}>{loading ? 'Salvando...' : 'Publicar Veículo'}</button>
          </form>
        )}

        {adminTab === 'meu_estoque' && (
          <div>
            <h3>Gerenciar Estoque (Top 3 na Home)</h3>
            <p style={{fontSize:'12px', color:'var(--text-secondary)', marginBottom:'15px'}}>Clique na Estrela para destacar o carro na página inicial (Máx 3).</p>
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              {veiculos.map(v => (
                <div key={v.id} style={{background:'var(--bg-input)', padding:'15px', borderRadius:'8px', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'15px'}}>
                   <div style={{width:'60px', height:'60px', borderRadius:'4px', overflow:'hidden', flexShrink:0}}>
                     {v.galeria?.[0] ? <img src={v.galeria[0].url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{width:'100%',height:'100%',background:'#000'}}/>}
                   </div>
                   <div style={{flex:1}}>
                     <strong style={{color:'var(--text-primary)', display:'block', fontSize:'14px'}}>{v.marca} {v.modelo}</strong>
                     <span style={{fontSize:'12px', color:'var(--text-secondary)'}}>R$ {v.preco}</span>
                   </div>
                   <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                     {/* BOTÃO DE DESTAQUE AQUI */}
                     <button onClick={() => toggleDestaque(v)} style={{background: v.destaque ? 'var(--accent-gold)' : 'transparent', color: v.destaque ? '#000' : 'var(--text-secondary)', border: `1px solid ${v.destaque ? 'var(--accent-gold)' : 'var(--border-color)'}`, padding:'6px', borderRadius:'4px', cursor:'pointer', fontSize:'11px', fontWeight:'bold'}}>
                        ⭐ {v.destaque ? 'Destacado' : 'Destacar'}
                     </button>
                     <button onClick={() => prepararEdicaoVeiculo(v)} style={{background:'transparent', color:'var(--text-primary)', border:'1px solid var(--border-color)', padding:'6px', borderRadius:'4px', cursor:'pointer', fontSize:'11px'}}>✏️ Editar</button>
                     <select value={v.status} onChange={(e) => atualizarStatusVeiculo(v.id!, e.target.value)} style={{padding:'6px', borderRadius:'4px', background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border-color)', fontSize:'11px'}}>
                       <option value="Disponível">Disponível</option><option value="Vendido">Vendido</option><option value="Oculto">Oculto</option>
                     </select>
                     <button onClick={() => deletarVeiculo(v.id!)} style={{background:'var(--danger)', color:'white', border:'none', padding:'6px', borderRadius:'4px', cursor:'pointer', fontSize:'11px'}}>🗑️ Excluir</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'avaliacoes' && (
          <div>
             <h3 style={{color:'white'}}>Depoimentos de Clientes</h3>
             {avaliacoes.map(a => (
              <div key={a.id} style={{background:'var(--bg-input)', padding:'15px', borderRadius:'8px', marginBottom:'10px', display:'flex', gap:'15px'}}>
                {a.foto_url && <img src={a.foto_url} style={{width:'50px', height:'50px', borderRadius:'50%', objectFit:'cover'}} />}
                <div style={{flex:1}}>
                  <strong style={{color:'white'}}>{a.nome}</strong>
                  <p style={{fontSize:'12px', color:'gray'}}>{a.texto}</p>
                </div>
                <div>
                   {!a.aprovado && <button onClick={() => aprovarAvaliacao(a.id)} style={{background:'#25D366', color:'white', padding:'5px 10px', borderRadius:'4px', border:'none', cursor:'pointer'}}>Aprovar</button>}
                   <button onClick={() => deletarAvaliacao(a.id)} style={{background:'var(--danger)', color:'white', padding:'5px 10px', borderRadius:'4px', border:'none', cursor:'pointer', marginLeft:'5px'}}>X</button>
                </div>
              </div>
             ))}
          </div>
        )}

        {adminTab === 'videos' && (
          <form onSubmit={salvarVideoGaleria}>
            <h3 style={{color:'white'}}>Adicionar Vídeo Resplande Life</h3>
            <input placeholder="Título" value={vidForm.titulo} onChange={e => setVidForm({...vidForm, titulo: e.target.value})} required />
            <input type="file" accept="video/*" onChange={e => setVidForm({...vidForm, file: e.target.files?.[0] || null})} required />
            <button type="submit" className="btn-submit-car">Salvar Vídeo</button>
            <div style={{marginTop:'20px'}}>
              {videosGaleria.map(vid => (
                <div key={vid.id} style={{background:'var(--bg-input)', padding:'10px', borderRadius:'8px', marginBottom:'10px', display:'flex', justifyContent:'space-between'}}>
                  <strong style={{color:'white'}}>{vid.titulo}</strong>
                  <button onClick={() => deletarVideo(vid.id)} style={{background:'var(--danger)', color:'white', padding:'5px', border:'none'}}>Excluir</button>
                </div>
              ))}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}