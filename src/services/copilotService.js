/**
 * Co-pilot Service
 *
 * Builds measure context, system prompt, and sends messages.
 * Provider-agnostic — swap providers in copilotProviders.js, not here.
 */

import { getCopilotProvider } from './copilotProviders';

// =============================================================================
// Context Building
// =============================================================================

export function buildCopilotContext({
  measure,
  libraryComponents,
  activeTab,
  codeStates,
  lastGeneratedCode,
}) {
  if (!measure) {
    return { hasMeasure: false, activeTab };
  }

  const populations = measure.populations.map(pop => ({
    type: pop.type,
    description: pop.description,
    criteriaCount: countCriteria(pop.criteria),
    criteria: summarizeCriteria(pop.criteria),
  }));

  const overrideCount = Object.values(codeStates || {}).filter(
    s => s && Object.values(s.overrides || {}).some(o => o?.isLocked)
  ).length;

  return {
    hasMeasure: true,
    activeTab,
    lastGeneratedCode: lastGeneratedCode || null,
    measure: {
      id: measure.id,
      measureId: measure.metadata?.measureId,
      title: measure.metadata?.title,
      program: measure.metadata?.program,
      measurementPeriod: measure.metadata?.measurementPeriod,
      status: measure.metadata?.reviewStatus,
      populations,
      valueSetCount: measure.valueSets?.length || 0,
      componentCount: countAllComponents(measure),
      overrideCount,
      libraryComponentsAvailable: libraryComponents.length,
    },
  };
}

function countCriteria(node) {
  if (!node) return 0;
  if (node.children) return node.children.reduce((sum, c) => sum + countCriteria(c), 0);
  return 1;
}

function countAllComponents(measure) {
  let count = 0;
  const traverse = node => {
    if (!node) return;
    if (node.type && !node.children) count++;
    if (node.children) node.children.forEach(traverse);
    if (node.criteria) traverse(node.criteria);
  };
  measure.populations?.forEach(pop => traverse(pop.criteria));
  return count;
}

function summarizeCriteria(node, depth = 0) {
  if (!node || depth > 3) return [];
  const items = [];
  if (node.children) {
    node.children.forEach(child => {
      if (child.type && !child.children) {
        items.push({
          type: child.type,
          description: child.description,
          valueSet: child.valueSet?.name,
          oid: child.valueSet?.oid,
        });
      } else if (child.children) {
        items.push(...summarizeCriteria(child, depth + 1));
      }
    });
  }
  return items;
}

// =============================================================================
// System Prompt
// =============================================================================

export function buildCopilotSystemPrompt(context) {
  const lines = [
    `You are the AND/OR_ai Co-Pilot embedded in Insight Forge, a clinical quality measure (CQM) authoring tool used by clinical informaticists and healthcare engineers.`,
    ``,
    `**Important:** This is a new session. You have no memory of prior conversations or previous sessions with this user. Do not reference or assume any context from past interactions. All context you have about the current measure comes from the structured data provided below — treat it as your sole source of truth. If the user references something from a prior session, let them know you're starting fresh and ask them to re-share any relevant details.`,
    ``,
    `Your role is to help users:`,
    `- Understand and explain measure logic (CQL, FHIR R4, QI-Core, eCQM standards)`,
    `- Identify potential issues in the measure structure`,
    `- Suggest improvements to data elements, value sets, and timing logic`,
    `- Answer questions about HEDIS, MIPS, eCQM, and QOF measure specifications`,
    `- Help refine UMS (Universal Measure Schema) components`,
    ``,
  ];

  if (!context.hasMeasure) {
    lines.push(`The user has not selected a measure yet (currently on the "${context.activeTab}" view).`);
    lines.push(`Answer general CQM questions or help them understand the tool.`);
  } else {
    const m = context.measure;
    lines.push(`## Active Measure`);
    lines.push(`**${m.measureId} — ${m.title}**`);
    lines.push(`Program: ${m.program || 'Unknown'} | Status: ${m.status || 'In progress'}`);
    if (m.measurementPeriod) {
      lines.push(`Measurement Period: ${m.measurementPeriod.start} to ${m.measurementPeriod.end}`);
    }
    lines.push(`Stats: ${m.componentCount} components | ${m.populations.length} populations | ${m.valueSetCount} value sets | ${m.overrideCount} active code overrides | ${m.libraryComponentsAvailable} library components available`);
    lines.push(``);
    lines.push(`## Population Structure`);
    m.populations.forEach(pop => {
      lines.push(`**${pop.type}** (${pop.criteriaCount} components): ${pop.description?.substring(0, 150) || ''}`);
      pop.criteria.slice(0, 6).forEach(c => {
        lines.push(`  - [${c.type}] ${c.description}${c.valueSet ? ` — ${c.valueSet}` : ''}${c.oid ? ` (${c.oid})` : ''}`);
      });
      if (pop.criteria.length > 6) lines.push(`  ... and ${pop.criteria.length - 6} more`);
    });
    lines.push(``);
    lines.push(`User is currently on the "${context.activeTab}" view.`);

    // Include generated code if available and belongs to current measure
    const code = context.lastGeneratedCode;
    if (code?.cql && code.measureId === context.measure?.id) {
      lines.push(``);
      lines.push(`## Current Generated CQL`);
      lines.push(`The following is the actual CQL output currently shown to the user. Use this when asked about syntax, logic, or errors in the generated code.`);
      lines.push('```cql');
      const cqlTruncated = code.cql.length > 8000 ? code.cql.substring(0, 8000) + '\n... [truncated]' : code.cql;
      lines.push(cqlTruncated);
      lines.push('```');
    }

    if (code?.sql && code.measureId === context.measure?.id) {
      lines.push(``);
      lines.push(`## Current Generated Synapse SQL`);
      lines.push('```sql');
      const sqlTruncated = code.sql.length > 4000 ? code.sql.substring(0, 4000) + '\n... [truncated]' : code.sql;
      lines.push(sqlTruncated);
      lines.push('```');
    }
  }

  lines.push(``);
  lines.push(`## Response Format`);
  lines.push(``);
  lines.push(`For questions: respond in plain text.`);
  lines.push(``);
  lines.push(`When the user asks you to make a change to a component field (status, timing, description, etc.), end your response with exactly one JSON block in this format:`);
  lines.push('```json');
  lines.push(JSON.stringify({
    action: 'propose_field_edit',
    componentDescription: 'the component description as shown in the measure',
    field: 'encounterStatus',
    currentValue: 'in-progress',
    proposedValue: 'finished',
    explanation: 'One sentence reason'
  }, null, 2));
  lines.push('```');
  lines.push(``);
  lines.push(`When the user asks you to fix or rewrite a piece of generated CQL or SQL, end your response with exactly one JSON block in this format:`);
  lines.push('```json');
  lines.push(JSON.stringify({
    action: 'propose_code_fix',
    format: 'cql',
    description: 'Brief description of what is being fixed',
    currentSnippet: 'the exact current code snippet with the problem',
    proposedSnippet: 'the corrected replacement code',
    explanation: 'One sentence reason'
  }, null, 2));
  lines.push('```');
  lines.push(``);
  lines.push(`Rules: Only include JSON when the user explicitly asks to make a change. Never include JSON for questions or explanations. One JSON block maximum per response. Always write your explanation in plain text before the JSON block.`);
  lines.push(``);
  lines.push(`## Guidelines`);
  lines.push(`- Be concise and clinical. Use correct eCQM/FHIR/CQL terminology.`);
  lines.push(`- When suggesting changes, be specific: name the value set, OID, population, and timing.`);
  lines.push(`- Do not make up OIDs or value set names. If you don't know an exact OID, say so.`);
  lines.push(`- Reference FHIR R4 data model and QI-Core profiles when relevant.`);
  lines.push(`- For code fixes, note that applying a fix patches the Co-Pilot's view of the code but does NOT permanently override the generated code. The user must use the code editor for permanent overrides.`);

  return lines.join('\n');
}

// =============================================================================
// Message Sending
// =============================================================================

/**
 * Send a message to the co-pilot and get a response string.
 *
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @param {Object} context - Built by buildCopilotContext()
 * @param {Object} settings - From settingsStore (provider, model, apiKeys, etc.)
 * @returns {Promise<string>} - The assistant's response
 */
export async function sendCopilotMessage(messages, context, settings) {
  const provider = getCopilotProvider(settings);
  const systemPrompt = buildCopilotSystemPrompt(context);
  return provider.send(messages, systemPrompt);
}
