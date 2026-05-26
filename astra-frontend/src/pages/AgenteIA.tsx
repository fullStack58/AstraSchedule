// src/pages/AgenteIA.tsx
import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../services/api';

interface ToolCall {
  tool: string;
  args: unknown;
  result: unknown;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  typing?: boolean;
  error?: boolean;
}

// Historial para el backend (sin campos de UI como typing/error)
interface ApiMsg {
  role: 'user' | 'assistant';
  content: string;
}

const CHIPS = [
  '¿Cuántos grupos de IS sin horario en jornada Diurna?',
  'Lista los conflictos críticos activos del semestre',
  '¿Qué docentes tienen sobrecarga de horas?',
  'Propón horario para el grupo 2303A de Álgebra Lineal',
  '¿Qué salones están disponibles el Lunes de 7:00 a 10:00?',
  '¿Cuál es el resumen general del semestre 2025-1?',
];

export default function AgenteIA() {
  const [msgs,    setMsgs]    = useState<Msg[]>([{
    role: 'assistant',
    content: '¡Bienvenido al Agente AstraSchedule! Soy tu asistente especializado en gestión académica de la UNIAJC. Puedo consultarte sobre horarios, docentes, salones, grupos y conflictos del semestre en tiempo real.',
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Verificar si el backend está disponible al montar
  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => setBackendOk(r.ok))
      .catch(() => setBackendOk(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Construir historial para el backend (solo role + content)
  function buildHistory(messages: Msg[]): ApiMsg[] {
    return messages
      .filter(m => !m.typing && !m.error)
      .map(m => ({ role: m.role, content: m.content }));
  }

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    setInput('');
    setLoading(true);

    // Agregar mensaje del usuario + indicador de typing
    const history = buildHistory(msgs);
    setMsgs(prev => [
      ...prev,
      { role: 'user', content: t },
      { role: 'assistant', content: '', typing: true },
    ]);

    try {
      if (backendOk === false) {
        // Backend no disponible — modo demo
        await new Promise(r => setTimeout(r, 1200));
        setMsgs(prev => prev.filter(m => !m.typing).concat([{
          role: 'assistant',
          content: '⚠️ El backend no está disponible en este momento. Para usar el agente IA real, levanta el servidor con <code>npm run dev</code> en la carpeta <code>astra-backend</code>.',
          error: true,
        }]));
        return;
      }

      // Llamada real al backend
      const res = await aiApi.chat(t, history) as {
        data: { content: string; tool_calls: ToolCall[] }
      };

      const { content, tool_calls } = res.data;

      setMsgs(prev => prev.filter(m => !m.typing).concat([{
        role: 'assistant',
        content,
        toolCalls: tool_calls?.length > 0 ? tool_calls : undefined,
      }]));

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMsgs(prev => prev.filter(m => !m.typing).concat([{
        role: 'assistant',
        content: `❌ Error al conectar con el agente: ${msg}. Verifica que el backend esté corriendo en el puerto 3001.`,
        error: true,
      }]));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function clearChat() {
    setMsgs([{
      role: 'assistant',
      content: 'Conversación reiniciada. ¿En qué puedo ayudarte?',
    }]);
  }

  return (
    <>
      <div className="page-title">Agente IA · Groq</div>
      <div className="page-sub">
        Asistente conversacional para gestión académica · llama-3.3-70b-versatile
      </div>

      {/* Estado del backend */}
      {backendOk === false && (
        <div style={{
          padding: '10px 14px', marginBottom: 14,
          background: '#FEF3C7', border: '1px solid #F59E0B',
          borderRadius: 'var(--r)', fontSize: 12, color: '#92400E',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-alert-triangle" style={{fontSize:15}} />
          Backend no disponible — el agente no puede consultar datos reales.
          Levanta el servidor: <code style={{background:'rgba(0,0,0,.08)',padding:'1px 6px',borderRadius:4}}>cd astra-backend && npm run dev</code>
        </div>
      )}
      {backendOk === true && (
        <div style={{
          padding: '8px 14px', marginBottom: 14,
          background: '#F0FDF4', border: '1px solid #86EFAC',
          borderRadius: 'var(--r)', fontSize: 12, color: '#15803D',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-circle-check" style={{fontSize:15}} />
          Conectado al backend · Base de datos UNIAJC en tiempo real
        </div>
      )}

      <div className="ai-panel" style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}>
        {/* Header */}
        <div className="ai-panel-top">
          <div className="ai-status-dot" style={{
            background: backendOk === false ? '#F59E0B' : '#22C55E'
          }} />
          <div className="ai-label">AstraSchedule IA</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {backendOk ? 'PostgreSQL · UNIAJC' : 'Sin conexión'}
            </span>
            <div className="ai-model-chip">llama-3.3-70b</div>
            <button
              onClick={clearChat}
              style={{
                background: 'none', border: '1px solid var(--border2)',
                borderRadius: 'var(--r)', padding: '2px 8px',
                fontSize: 10, color: 'var(--text3)', cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
              title="Limpiar conversación"
            >
              <i className="ti ti-trash" style={{ fontSize: 11 }} /> Limpiar
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="ai-messages" style={{ flex: 1, maxHeight: 'none' }}>
          {msgs.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role === 'user' ? 'user' : ''}`}>
              <div className={`ai-av ${m.role === 'user' ? 'user-av' : ''}`}>
                {m.role === 'user' ? 'Tú' : 'IA'}
              </div>
              <div className="ai-bubble" style={m.error ? { borderColor: '#FCA5A5', background: '#FFF8F8' } : {}}>
                {m.typing ? (
                  <div className="ai-typing-wrap">
                    <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
                  </div>
                ) : (
                  <>
                    {/* Tool calls visibles */}
                    {m.toolCalls && m.toolCalls.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {m.toolCalls.map((tc, j) => (
                          <div key={j} className="ai-tool-call">
                            <div className="ai-tool-name">
                              🔧 {tc.tool}
                            </div>
                            <div style={{
                              fontSize: 10, color: '#15803D', marginTop: 2,
                              fontFamily: 'var(--mono)',
                              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            }}>
                              {JSON.stringify(tc.result, null, 2).substring(0, 300)}
                              {JSON.stringify(tc.result).length > 300 ? '...' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Contenido del mensaje */}
                    <div
                      style={{ fontSize: 12, lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, '<br/>') }}
                    />

                    {/* Chips solo en el primer mensaje */}
                    {i === 0 && (
                      <div className="ai-chips" style={{ marginTop: 10 }}>
                        {CHIPS.map(c => (
                          <button
                            key={c}
                            className="ai-chip"
                            onClick={() => send(c)}
                            disabled={loading}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="ai-input-row">
          <input
            ref={inputRef}
            className="ai-input"
            placeholder={
              backendOk === false
                ? 'Backend no disponible...'
                : 'Pregunta al agente... ej: ¿Cuántos grupos sin horario en IS Diurna?'
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
          />
          <button
            className="ai-send-btn"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ opacity: loading || !input.trim() ? .6 : 1 }}
          >
            {loading
              ? <><i className="ti ti-loader" style={{ fontSize: 12, animation: 'spin 1s linear infinite' }} /> Procesando</>
              : <><i className="ti ti-send" style={{ fontSize: 12 }} /> Enviar</>
            }
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}
