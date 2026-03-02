import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { diffLines } from 'diff';
import { useMeasureStore } from '../../stores/measureStore';
import { useComponentLibraryStore } from '../../stores/componentLibraryStore';
import { useComponentCodeStore } from '../../stores/componentCodeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { buildCopilotContext, sendCopilotMessage } from '../../services/copilotService';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'copilot-fab-position';
const FAB_WIDTH = 220;
const FAB_HEIGHT = 48;
const EDGE_PADDING = 16;
const CHAT_WIDTH = 380;
const CHAT_MAX_HEIGHT = 520;

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: `Hi! I'm your AND/OR.ai Co-Pilot — starting a fresh session. I don't have memory of any prior conversations, but I do have full context of the measure you're currently working on.\n\nYou can ask me things like:\n- "What does the denominator exclusion logic mean?"\n- "Why does this encounter component filter to 'finished' status?"\n- "What value set should I use for colorectal cancer screening?"\n- "Change the encounter status to finished"\n\nWhat can I help you with?`,
  timestamp: Date.now(),
};

// =============================================================================
// Helper Functions
// =============================================================================

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getDefaultPosition = () => ({
  x: typeof window !== 'undefined' ? window.innerWidth - FAB_WIDTH - EDGE_PADDING : EDGE_PADDING,
  y: typeof window !== 'undefined' ? window.innerHeight - FAB_HEIGHT - EDGE_PADDING : EDGE_PADDING,
});

const snapToEdge = (x, y) => {
  const maxX = window.innerWidth - FAB_WIDTH - EDGE_PADDING;
  const maxY = window.innerHeight - FAB_HEIGHT - EDGE_PADDING;
  const centerX = window.innerWidth / 2;
  const snappedX = x + FAB_WIDTH / 2 < centerX ? EDGE_PADDING : maxX;
  const snappedY = clamp(y, EDGE_PADDING, maxY);
  return { x: snappedX, y: snappedY };
};

// =============================================================================
// Proposal Parsing
// =============================================================================

function parseProposal(content) {
  const match = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.action === 'propose_field_edit' || parsed.action === 'propose_code_fix') {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function stripJsonBlock(content) {
  return content.replace(/```json[\s\S]*?```/g, '').trim();
}

function findElementByDescription(measure, targetDescription) {
  if (!targetDescription) return null;
  const normalized = targetDescription.toLowerCase().trim();
  let found = null;

  const traverse = (node) => {
    if (!node || found) return;
    if (node.type && !node.children) {
      const desc = (node.description || '').toLowerCase();
      if (desc.includes(normalized) || normalized.includes(desc)) {
        found = node;
        return;
      }
    }
    node.children?.forEach(traverse);
    if (node.criteria) traverse(node.criteria);
  };

  measure.populations?.forEach(pop => traverse(pop.criteria));
  return found;
}

// =============================================================================
// Inject Styles
// =============================================================================

const injectStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('draggable-fab-styles')) return;

  const styleSheet = document.createElement('style');
  styleSheet.id = 'draggable-fab-styles';
  styleSheet.textContent = `
    @keyframes gentlePulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(199, 57, 43, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1); }
      50% { box-shadow: 0 6px 24px rgba(199, 57, 43, 0.45), 0 2px 4px rgba(0, 0, 0, 0.1); }
    }
    @keyframes statusPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }
    @keyframes chatSlideIn {
      from { opacity: 0; transform: translateY(10px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes dotPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);
};

// =============================================================================
// ProposalDiff Component
// =============================================================================

function ProposalDiff({ currentCode, proposedCode }) {
  const diff = useMemo(() => {
    if (!currentCode || !proposedCode) return [];
    return diffLines(currentCode, proposedCode);
  }, [currentCode, proposedCode]);

  const stats = useMemo(() => {
    let added = 0, removed = 0;
    diff.forEach(part => {
      const lines = part.value.split('\n').filter(l => l !== '').length;
      if (part.added) added += lines;
      if (part.removed) removed += lines;
    });
    return { added, removed };
  }, [diff]);

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0', marginTop: 8 }}>
      <div style={{ background: '#f5f5f5', padding: '6px 10px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
        <span style={{ color: '#666' }}>Changes:</span>
        {stats.removed > 0 && <span style={{ color: '#e74c3c', fontWeight: 600 }}>-{stats.removed}</span>}
        {stats.added > 0 && <span style={{ color: '#27ae60', fontWeight: 600 }}>+{stats.added}</span>}
      </div>
      <div style={{ maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10, background: '#fafafa' }}>
        {diff.map((part, index) => (
          <div
            key={index}
            style={{
              background: part.added ? 'rgba(39, 174, 96, 0.1)' : part.removed ? 'rgba(231, 76, 60, 0.1)' : 'transparent',
              borderLeft: `2px solid ${part.added ? '#27ae60' : part.removed ? '#e74c3c' : 'transparent'}`,
            }}
          >
            {part.value.split('\n').map((line, lineIndex, lines) => (
              lineIndex === lines.length - 1 && line === '' ? null : (
                <div key={lineIndex} style={{ padding: '2px 8px', color: part.added ? '#27ae60' : part.removed ? '#e74c3c' : '#666', textDecoration: part.removed ? 'line-through' : 'none' }}>
                  <span style={{ opacity: 0.5, marginRight: 4 }}>{part.added ? '+' : part.removed ? '-' : ' '}</span>
                  {line || ' '}
                </div>
              )
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ProposalCard Component
// =============================================================================

function ProposalCard({ proposal, state, onApply, onDismiss }) {
  if (state === 'applied') {
    return <div style={{ marginTop: 8, fontSize: 11, color: '#27ae60', display: 'flex', alignItems: 'center', gap: 4 }}><span>✓</span> Change applied</div>;
  }
  if (state === 'dismissed') {
    return <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>Dismissed</div>;
  }

  return (
    <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid #e0e0e0', background: '#fff' }}>
      <div style={{ background: '#f8f8f8', padding: '8px 12px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Proposed change</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c' }}>
          {proposal.action === 'propose_code_fix' ? (proposal.format === 'cql' ? 'CQL' : 'SQL') : 'Field edit'}
        </span>
      </div>
      <div style={{ padding: 12 }}>
        {proposal.action === 'propose_field_edit' && (
          <>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Component: {proposal.componentDescription}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <code style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', textDecoration: 'line-through', fontSize: 11 }}>{String(proposal.currentValue)}</code>
              <span style={{ color: '#999' }}>→</span>
              <code style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(39, 174, 96, 0.1)', color: '#27ae60', fontSize: 11 }}>{String(proposal.proposedValue)}</code>
            </div>
          </>
        )}
        {proposal.action === 'propose_code_fix' && (
          <>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{proposal.description}</div>
            <ProposalDiff currentCode={proposal.currentSnippet} proposedCode={proposal.proposedSnippet} />
          </>
        )}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8 }}>
        <button onClick={onApply} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Apply</button>
        <button onClick={onDismiss} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#f0f0f0', color: '#666', fontSize: 12, cursor: 'pointer' }}>Dismiss</button>
      </div>
    </div>
  );
}

// =============================================================================
// TypingIndicator Component
// =============================================================================

function TypingIndicator() {
  return (
    <div style={{ alignSelf: 'flex-start' }}>
      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#999',
              animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MessageBubble Component
// =============================================================================

function MessageBubble({ message, onApplyProposal, onDismissProposal }) {
  const isUser = message.role === 'user';

  const renderContent = (text) => {
    return text.split('\n').map((line, i, arr) => (
      <span key={i}>
        {line.split(/(`[^`]+`)/).map((part, j) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={j} style={{ padding: '1px 4px', borderRadius: 3, background: 'rgba(0,0,0,0.08)', fontSize: 11, fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
          }
          return part;
        })}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 14,
          borderBottomRightRadius: isUser ? 4 : 14,
          borderBottomLeftRadius: isUser ? 14 : 4,
          background: isUser ? 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)' : '#f5f5f5',
          color: isUser ? '#fff' : '#333',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {renderContent(message.content)}
        {message.proposal && (
          <ProposalCard
            proposal={message.proposal}
            state={message.proposalState}
            onApply={() => onApplyProposal(message.id, message.proposal)}
            onDismiss={() => onDismissProposal(message.id)}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DraggableFAB Component
// =============================================================================

export function DraggableFAB() {
  // Drag state
  const [position, setPosition] = useState(getDefaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const fabRef = useRef(null);
  const dragStarted = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Store subscriptions
  const activeMeasureId = useMeasureStore(state => state.activeMeasureId);
  const measures = useMeasureStore(state => state.measures);
  const activeMeasure = activeMeasureId ? measures.find(m => m.id === activeMeasureId) : null;

  // Inject styles on mount
  useEffect(() => {
    injectStyles();
  }, []);

  // Load position from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const maxX = window.innerWidth - FAB_WIDTH - EDGE_PADDING;
        const maxY = window.innerHeight - FAB_HEIGHT - EDGE_PADDING;
        setPosition({ x: clamp(parsed.x, EDGE_PADDING, maxX), y: clamp(parsed.y, EDGE_PADDING, maxY) });
      }
    } catch { /* ignore */ }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const maxX = window.innerWidth - FAB_WIDTH - EDGE_PADDING;
        const maxY = window.innerHeight - FAB_HEIGHT - EDGE_PADDING;
        return { x: clamp(prev.x, EDGE_PADDING, maxX), y: clamp(prev.y, EDGE_PADDING, maxY) };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isChatOpen]);

  // =============================================================================
  // Drag Handlers
  // =============================================================================

  const handlePointerDown = useCallback((e) => {
    if (!fabRef.current) return;
    fabRef.current.setPointerCapture(e.pointerId);
    dragStarted.current = false;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  const handlePointerMove = useCallback((e) => {
    if (!fabRef.current?.hasPointerCapture(e.pointerId)) return;
    dragStarted.current = true;
    setIsDragging(true);
    const maxX = window.innerWidth - FAB_WIDTH - EDGE_PADDING;
    const maxY = window.innerHeight - FAB_HEIGHT - EDGE_PADDING;
    setPosition({ x: clamp(e.clientX - dragOffset.current.x, EDGE_PADDING, maxX), y: clamp(e.clientY - dragOffset.current.y, EDGE_PADDING, maxY) });
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!fabRef.current) return;
    fabRef.current.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (dragStarted.current) {
      const snapped = snapToEdge(position.x, position.y);
      setPosition(snapped);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapped)); } catch { /* ignore */ }
    } else {
      setIsChatOpen(prev => !prev);
    }
    dragStarted.current = false;
  }, [position]);

  // =============================================================================
  // Chat Handlers
  // =============================================================================

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    setError(null);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const measureState = useMeasureStore.getState();
      const componentState = useComponentLibraryStore.getState();
      const codeState = useComponentCodeStore.getState();
      const settingsState = useSettingsStore.getState();

      const currentMeasure = measureState.activeMeasureId
        ? measureState.measures.find(m => m.id === measureState.activeMeasureId)
        : null;

      const context = buildCopilotContext({
        measure: currentMeasure,
        libraryComponents: componentState.components,
        activeTab: measureState.activeTab,
        codeStates: codeState.codeStates,
        lastGeneratedCode: measureState.lastGeneratedCode,
      });

      const settings = {
        selectedProvider: settingsState.selectedProvider,
        selectedModel: settingsState.selectedModel,
        apiKeys: settingsState.apiKeys,
        useBackendProxy: settingsState.useBackendApi,
      };

      const history = messages
        .filter(m => m.id !== 'welcome')
        .slice(-20)
        .concat(userMsg)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await sendCopilotMessage(history, context, settings);
      const proposal = parseProposal(response);

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: proposal ? stripJsonBlock(response) : response,
        proposal,
        proposalState: proposal ? 'pending' : null,
        timestamp: Date.now(),
      }]);
    } catch (err) {
      const msg = err.message || 'Failed to get a response.';
      const isKeyError = msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('401');
      setError(isKeyError ? 'No API key configured. Go to Settings to add your key.' : `Error: ${msg}`);
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
  };

  const handleDismissProposal = useCallback((messageId) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, proposalState: 'dismissed' } : m));
  }, []);

  const handleApplyProposal = useCallback((messageId, proposal) => {
    try {
      const {
        measures,
        activeMeasureId,
        updateDataElement,
        setLastGeneratedCode,
        lastGeneratedCode,
        saveMeasureCodeOverride,
        measureCodeOverrides,
      } = useMeasureStore.getState();
      const measure = measures.find(m => m.id === activeMeasureId);
      if (!measure) return;

      if (proposal.action === 'propose_field_edit') {
        const element = findElementByDescription(measure, proposal.componentDescription);
        if (element) {
          updateDataElement(activeMeasureId, element.id, { [proposal.field]: proposal.proposedValue }, 'field_update', `AND/OR.ai Co-Pilot: ${proposal.explanation}`);
        }
      }

      if (proposal.action === 'propose_code_fix') {
        const formatKey = proposal.format === 'cql' ? 'cql' : 'synapse-sql';
        const overrideKey = `${activeMeasureId}::${formatKey}`;
        const existingOverride = measureCodeOverrides[overrideKey];

        if (proposal.format === 'cql' && lastGeneratedCode?.cql) {
          const currentCode = existingOverride?.code || lastGeneratedCode.cql;
          const patchedCql = currentCode.replace(proposal.currentSnippet, proposal.proposedSnippet);
          setLastGeneratedCode(patchedCql, lastGeneratedCode.sql, lastGeneratedCode.measureId);
          const noteContent = `AND/OR.ai Co-Pilot fix: ${proposal.description || proposal.explanation || 'Applied suggested code change'}`;
          saveMeasureCodeOverride(activeMeasureId, formatKey, patchedCql, noteContent, lastGeneratedCode.cql);
        }

        if ((proposal.format === 'synapse-sql' || proposal.format === 'sql') && lastGeneratedCode?.sql) {
          const currentCode = existingOverride?.code || lastGeneratedCode.sql;
          const patchedSql = currentCode.replace(proposal.currentSnippet, proposal.proposedSnippet);
          setLastGeneratedCode(lastGeneratedCode.cql, patchedSql, lastGeneratedCode.measureId);
          const noteContent = `AND/OR.ai Co-Pilot fix: ${proposal.description || proposal.explanation || 'Applied suggested code change'}`;
          saveMeasureCodeOverride(activeMeasureId, 'synapse-sql', patchedSql, noteContent, lastGeneratedCode.sql);
        }
      }

      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, proposalState: 'applied' } : m));
    } catch (err) {
      console.error('Failed to apply proposal:', err);
    }
  }, []);

  // =============================================================================
  // Computed Values
  // =============================================================================

  const isOnRightHalf = position.x + FAB_WIDTH / 2 > window.innerWidth / 2;
  const chatPosition = {
    left: isOnRightHalf ? position.x - CHAT_WIDTH - 12 : position.x + FAB_WIDTH + 12,
    bottom: window.innerHeight - position.y - FAB_HEIGHT,
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <>
      {/* FAB Button */}
      <button
        ref={fabRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: FAB_WIDTH,
          height: FAB_HEIGHT,
          background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
          border: 'none',
          borderRadius: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '0 16px',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 9999,
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          touchAction: 'none',
          userSelect: 'none',
          transition: isDragging
            ? 'transform 0.1s ease, box-shadow 0.1s ease'
            : 'left 0.3s cubic-bezier(.4,0,.2,1), top 0.3s cubic-bezier(.4,0,.2,1), transform 0.1s ease, box-shadow 0.1s ease',
          transform: isDragging ? 'scale(1.06)' : 'scale(1)',
          boxShadow: isDragging ? '0 12px 32px rgba(199, 57, 43, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)' : undefined,
          animation: isDragging ? 'none' : 'gentlePulse 3s ease-in-out infinite',
        }}
      >
        {/* Compass Icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4" /><path d="M12 18v4" />
          <path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" />
          <path d="M2 12h4" /><path d="M18 12h4" />
          <path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" />
        </svg>
        <span>AND/OR.ai Co-Pilot</span>
        {/* Status Dot */}
        <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#2ecc71', animation: 'statusPulse 2s ease-in-out infinite' }} />
      </button>

      {/* Chat Panel */}
      {isChatOpen && (
        <div
          style={{
            position: 'fixed',
            left: chatPosition.left,
            bottom: chatPosition.bottom,
            width: CHAT_WIDTH,
            maxHeight: CHAT_MAX_HEIGHT,
            backgroundColor: '#fff',
            borderRadius: 16,
            boxShadow: '0 12px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            fontFamily: '"DM Sans", sans-serif',
            animation: 'chatSlideIn 0.25s ease-out',
          }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                AND/OR.ai Co-Pilot
                {activeMeasure && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                    {activeMeasure.metadata?.measureId || 'Active'}
                  </span>
                )}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>
                {activeMeasure ? 'Ask about your measure logic' : 'No measure selected'}
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200, maxHeight: 320 }}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} onApplyProposal={handleApplyProposal} onDismissProposal={handleDismissProposal} />
            ))}
            {isThinking && <TypingIndicator />}
            {error && (
              <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#c0392b', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚠</span>
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#f8f8f8', borderRadius: 12, padding: '8px 12px', border: '1px solid #e8e8e8' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this measure..."
                disabled={isThinking}
                rows={1}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontFamily: '"DM Sans", sans-serif',
                  color: '#333',
                  outline: 'none',
                  minHeight: 20,
                  maxHeight: 80,
                  lineHeight: 1.4,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: input.trim() && !isThinking ? 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)' : '#ddd',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
                  opacity: !input.trim() || isThinking ? 0.6 : 1,
                }}
              >
                {isThinking ? '...' : 'Send'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#999', marginTop: 6, paddingLeft: 4 }}>Enter to send · Shift+Enter for new line</div>
          </div>
        </div>
      )}
    </>
  );
}

export default DraggableFAB;
