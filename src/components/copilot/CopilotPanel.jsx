import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Send, ChevronDown, Loader2, AlertCircle, GitCompare } from 'lucide-react';
import { diffLines } from 'diff';
import { useMeasureStore } from '../../stores/measureStore';
import { useComponentLibraryStore } from '../../stores/componentLibraryStore';
import { useComponentCodeStore } from '../../stores/componentCodeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { buildCopilotContext, sendCopilotMessage } from '../../services/copilotService';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: `Hi! I'm your AlgoAccelerator co-pilot. I have full context of the measure you're working on.\n\nYou can ask me things like:\n- "What does the denominator exclusion logic mean?"\n- "Why does this encounter component filter to 'finished' status?"\n- "What value set should I use for colorectal cancer screening?"\n- "Change the encounter status to finished"\n\nWhat can I help you with?`,
  timestamp: Date.now(),
};

// =============================================================================
// Proposal Parsing
// =============================================================================

function parseProposal(content) {
  const match = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (
      parsed.action === 'propose_field_edit' ||
      parsed.action === 'propose_code_fix'
    ) {
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
// ProposalDiff Component - Shows visual diff for code changes
// =============================================================================

function ProposalDiff({ currentCode, proposedCode }) {
  const diff = useMemo(() => {
    if (!currentCode || !proposedCode) return [];
    return diffLines(currentCode, proposedCode);
  }, [currentCode, proposedCode]);

  // Count changes
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
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Diff header with stats */}
      <div
        className="flex items-center gap-2 px-2 py-1.5"
        style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}
      >
        <GitCompare size={12} style={{ color: 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Changes:</span>
        {stats.removed > 0 && (
          <span className="font-medium" style={{ color: 'var(--danger)' }}>-{stats.removed}</span>
        )}
        {stats.added > 0 && (
          <span className="font-medium" style={{ color: 'var(--success)' }}>+{stats.added}</span>
        )}
      </div>

      {/* Diff content */}
      <div className="max-h-[150px] overflow-auto font-mono" style={{ fontSize: '10px', background: 'var(--bg)' }}>
        {diff.map((part, index) => (
          <div
            key={index}
            style={{
              background: part.added ? 'rgba(34, 197, 94, 0.1)' : part.removed ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              borderLeft: part.added ? '2px solid var(--success)' : part.removed ? '2px solid var(--danger)' : '2px solid transparent',
            }}
          >
            {part.value.split('\n').map((line, lineIndex, lines) => (
              lineIndex === lines.length - 1 && line === '' ? null : (
                <div
                  key={lineIndex}
                  className="flex px-1.5 py-0.5"
                  style={{
                    color: part.added ? 'var(--success)' : part.removed ? 'var(--danger)' : 'var(--text-muted)',
                    textDecoration: part.removed ? 'line-through' : 'none',
                  }}
                >
                  <span className="w-4 flex-shrink-0 text-right pr-1 opacity-50 select-none">
                    {part.added ? '+' : part.removed ? '-' : ' '}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-all">{line || ' '}</span>
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
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--success)' }}>
        <span>✓</span>
        <span>Change applied</span>
      </div>
    );
  }
  if (state === 'dismissed') {
    return (
      <div className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
        Dismissed
      </div>
    );
  }

  return (
    <div
      className="mt-2 rounded-xl overflow-hidden text-xs"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <GitCompare size={12} style={{ color: 'var(--accent)' }} />
        <span className="font-medium" style={{ color: 'var(--text)' }}>Proposed change</span>
        <span
          className="px-1.5 py-0.5 rounded-full text-xs"
          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          {proposal.action === 'propose_code_fix'
            ? (proposal.format === 'cql' ? 'CQL' : 'SQL')
            : 'Field edit'}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-2">
        {proposal.action === 'propose_field_edit' && (
          <>
            <div style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-dim)' }}>Component: </span>
              {proposal.componentDescription}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <code
                className="px-1.5 py-0.5 rounded line-through"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                {String(proposal.currentValue)}
              </code>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <code
                className="px-1.5 py-0.5 rounded"
                style={{ background: 'var(--success-light)', color: 'var(--success)' }}
              >
                {String(proposal.proposedValue)}
              </code>
            </div>
          </>
        )}

        {proposal.action === 'propose_code_fix' && (
          <>
            <div style={{ color: 'var(--text-muted)' }}>{proposal.description}</div>
            <ProposalDiff
              currentCode={proposal.currentSnippet}
              proposedCode={proposal.proposedSnippet}
            />
          </>
        )}
      </div>

      {/* Actions */}
      <div
        className="px-3 py-2 flex gap-2 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          onClick={onApply}
          className="px-3 py-1 rounded-lg font-medium text-white transition-colors"
          style={{ background: 'var(--accent)' }}
        >
          Apply
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--text-muted)',
                animation: `copilot-dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onApplyProposal, onDismissProposal }) {
  const isUser = message.role === 'user';

  const renderContent = (text) => {
    return text.split('\n').map((line, i, arr) => (
      <span key={i}>
        {line.split(/(`[^`]+`)/).map((part, j) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={j} className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(0,0,0,0.12)' }}>
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        })}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
        style={{
          background: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
          color: isUser ? '#fff' : 'var(--text)',
          borderBottomRightRadius: isUser ? '4px' : undefined,
          borderBottomLeftRadius: !isUser ? '4px' : undefined,
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

export function CopilotPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Only subscribe to the specific primitive values we need for UI updates
  const activeMeasureId = useMeasureStore(state => state.activeMeasureId);
  const measures = useMeasureStore(state => state.measures);
  const lastGeneratedCode = useMeasureStore(state => state.lastGeneratedCode);

  // Compute activeMeasure from the stable references
  const activeMeasure = activeMeasureId ? measures.find(m => m.id === activeMeasureId) : null;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isExpanded]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    setError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Get current state directly when sending (not reactively)
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

      // Last 20 messages (10 exchanges) as conversation history, excluding welcome
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
      setError(isKeyError
        ? 'No API key configured. Go to Settings to add your key.'
        : `Error: ${msg}`
      );
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
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };

  const handleDismissProposal = useCallback((messageId) => {
    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, proposalState: 'dismissed' } : m)
    );
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
        // Find the element by description match
        const element = findElementByDescription(measure, proposal.componentDescription);
        if (element) {
          updateDataElement(
            activeMeasureId,
            element.id,
            { [proposal.field]: proposal.proposedValue },
            'field_update',
            `Co-pilot: ${proposal.explanation}`
          );
        }
      }

      if (proposal.action === 'propose_code_fix') {
        // For code fixes: patch the code and log to edit history
        const formatKey = proposal.format === 'cql' ? 'cql' : 'synapse-sql';
        const overrideKey = `${activeMeasureId}::${formatKey}`;
        const existingOverride = measureCodeOverrides[overrideKey];

        if (proposal.format === 'cql' && lastGeneratedCode?.cql) {
          // Get current code (either from override or generated)
          const currentCode = existingOverride?.code || lastGeneratedCode.cql;
          const patchedCql = currentCode.replace(
            proposal.currentSnippet,
            proposal.proposedSnippet
          );

          // Update the live code view
          setLastGeneratedCode(patchedCql, lastGeneratedCode.sql, lastGeneratedCode.measureId);

          // Log to edit history with co-pilot attribution
          const noteContent = `Co-pilot fix: ${proposal.description || proposal.explanation || 'Applied suggested code change'}`;
          saveMeasureCodeOverride(
            activeMeasureId,
            formatKey,
            patchedCql,
            noteContent,
            lastGeneratedCode.cql // Original generated code
          );
        }

        if ((proposal.format === 'synapse-sql' || proposal.format === 'sql') && lastGeneratedCode?.sql) {
          // Get current code (either from override or generated)
          const currentCode = existingOverride?.code || lastGeneratedCode.sql;
          const patchedSql = currentCode.replace(
            proposal.currentSnippet,
            proposal.proposedSnippet
          );

          // Update the live code view
          setLastGeneratedCode(lastGeneratedCode.cql, patchedSql, lastGeneratedCode.measureId);

          // Log to edit history with co-pilot attribution
          const noteContent = `Co-pilot fix: ${proposal.description || proposal.explanation || 'Applied suggested code change'}`;
          saveMeasureCodeOverride(
            activeMeasureId,
            'synapse-sql',
            patchedSql,
            noteContent,
            lastGeneratedCode.sql // Original generated code
          );
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, proposalState: 'applied' } : m)
      );
    } catch (err) {
      console.error('Failed to apply proposal:', err);
    }
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end" style={{ pointerEvents: 'none' }}>
      {/* Expanded panel */}
      {isExpanded && (
        <div
          className="mb-2 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: '400px',
            height: '540px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)',
            animation: 'copilot-slide-up 0.22s ease-out',
            pointerEvents: 'all',
          }}
        >
          {/* Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={15} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Co-pilot</span>
              {activeMeasure ? (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                >
                  {activeMeasure.metadata?.measureId || 'Active measure'}
                </span>
              ) : (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-dim)' }}
                >
                  No measure selected
                </span>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onApplyProposal={handleApplyProposal}
                onDismissProposal={handleDismissProposal}
              />
            ))}
            {isThinking && <TypingIndicator />}
            {error && (
              <div
                className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
                style={{
                  background: 'var(--danger-light)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger-border)',
                }}
              >
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-3 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2 border transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this measure..."
                disabled={isThinking}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none"
                style={{
                  color: 'var(--text)',
                  minHeight: '20px',
                  maxHeight: '100px',
                  lineHeight: '1.5',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                className="flex-shrink-0 p-1.5 rounded-lg transition-all"
                style={{
                  background: input.trim() && !isThinking ? 'var(--accent)' : 'transparent',
                  opacity: !input.trim() || isThinking ? 0.4 : 1,
                }}
              >
                {isThinking
                  ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                  : <Send size={15} style={{ color: input.trim() ? '#fff' : 'var(--text-muted)' }} />
                }
              </button>
            </div>
            <p className="text-xs mt-1.5 px-1" style={{ color: 'var(--text-dim)' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Collapsed trigger button */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium transition-all"
        style={{
          background: 'var(--accent)',
          boxShadow: '0 4px 16px rgba(199,70,52,0.35)',
          transform: isExpanded ? 'scale(0.96)' : 'scale(1)',
          pointerEvents: 'all',
        }}
      >
        <Sparkles size={15} />
        Co-pilot
        {activeMeasure && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.55)' }} />
        )}
      </button>
    </div>
  );
}
