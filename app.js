let supabaseClient = null;
let establecimientos = [];
let map = null;
let markers = [];
let infoWindow = null;

async function iniciarApp() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();

    if (config.supabaseUrl && config.supabaseKey) {
      supabaseClient = window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseKey
      );
      await cargarMascotas();
    }

    if (config.mapsApiKey) {
      cargarGoogleMaps(config.mapsApiKey);
    }
  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
  }
}

function cargarGoogleMaps(apiKey) {
  if (window.google && window.google.maps) {
    initMap();
    return;
  }
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

window.initMap = function () {
  const centroAsuncion = { lat: -25.2637, lng: -57.5759 };
  map = new google.maps.Map(document.getElementById('map'), {
    center: centroAsuncion,
    zoom: 13
  });
  infoWindow = new google.maps.InfoWindow();
  cargarEstablecimientos();
};

async function cargarEstablecimientos() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from('establecimientos')
    .select('*');

  if (error) {
    console.error('Error cargando establecimientos:', error);
    return;
  }

  establecimientos = data || [];
  renderEstablecimientos();
}

function renderEstablecimientos() {
  const lista = document.getElementById('lista-establecimientos');
  lista.innerHTML = '';

  markers.forEach((m) => m.setMap(null));
  markers = [];

  establecimientos.forEach((est) => {
    const li = document.createElement('li');
    li.textContent = `${est.nombre || 'Establecimiento'} — ${est.direccion || ''}`;
    lista.appendChild(li);

    if (map && est.lat && est.lng) {
      const marker = new google.maps.Marker({
        position: { lat: Number(est.lat), lng: Number(est.lng) },
        map,
        title: est.nombre || 'Establecimiento'
      });

      marker.addListener('click', () => {
        infoWindow.setContent(`<strong>${est.nombre || ''}</strong><br>${est.direccion || ''}`);
        infoWindow.open(map, marker);
      });

      markers.push(marker);
    }
  });
}

async function cargarMascotas() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from('mascotas')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error cargando mascotas:', error);
    return;
  }

  const lista = document.getElementById('lista-mascotas');
  lista.innerHTML = '';
  (data || []).forEach((m) => {
    const li = document.createElement('li');
    li.textContent = `${m.nombre} (${m.especie})${m.raza ? ' - ' + m.raza : ''}`;
    lista.appendChild(li);
  });
}

document.getElementById('mascota-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabaseClient) return;

  const nombre = document.getElementById('nombre-mascota').value.trim();
  const especie = document.getElementById('especie-mascota').value.trim();
  const raza = document.getElementById('raza-mascota').value.trim();

  if (!nombre || !especie) return;

  const { error } = await supabaseClient
    .from('mascotas')
    .insert([{ nombre, especie, raza }]);

  if (error) {
    console.error('Error al guardar mascota:', error);
    return;
  }

  e.target.reset();
  await cargarMascotas();
});

document.getElementById('chat-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const mensaje = input.value.trim();
  if (!mensaje) return;

  agregarMensajeChat(mensaje, 'user');
  input.value = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje })
    });
    const data = await res.json();
    agregarMensajeChat(data.respuesta || 'Sin respuesta del asistente.', 'bot');
  } catch (error) {
    console.error('Error en el chat:', error);
    agregarMensajeChat('Hubo un error al consultar con Gemini.', 'bot');
  }
});

function agregarMensajeChat(texto, tipo) {
  const box = document.getElementById('chat-mensajes');
  const div = document.createElement('div');
  div.className = `msg ${tipo}`;
  div.textContent = texto;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

iniciarApp();