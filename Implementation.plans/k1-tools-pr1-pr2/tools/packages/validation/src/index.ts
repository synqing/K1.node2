
/**
 * @package @k1/validation
 * Type and constraint checks for a generic node graph model used by codegen.
 * We intentionally keep this schema-light: nodes/edges with optional types.
 */

export type PortType = "color"|"float"|"int"|"audio";
export interface RuleViolation { id: string; node: number; message: string; severity: "error"|"warn"; }

// Minimal "model graph" interface for validation
export interface ModelNode { id: number; kind?: string; ports?: { in?: PortType[]; out?: PortType[] }; props?: Record<string, any>; }
export interface ModelEdge { from: number; to: number; type?: PortType; }
export interface ModelGraph { nodes: ModelNode[]; edges: ModelEdge[]; }

export function checkTypes(g: ModelGraph): RuleViolation[] {
  const out: RuleViolation[] = [];
  const nodeById = new Map(g.nodes.map(n => [n.id, n]));
  for (const e of g.edges) {
    const src = nodeById.get(e.from);
    const dst = nodeById.get(e.to);
    if (!src || !dst) {
      out.push({ id: "edge.missingNode", node: e.from, message: `Edge references missing node(s) ${e.from}->${e.to}`, severity: "error" });
      continue;
    }
    const expected = e.type;
    if (expected && dst.ports?.in && dst.ports.in.length) {
      // naive: require at least one input port matches expected type
      if (!dst.ports.in.includes(expected)) {
        out.push({ id: "type.mismatch", node: e.to, message: `Type mismatch on edge ${e.from}->${e.to}: expected ${expected}`, severity: "error" });
      }
    }
  }
  return out;
}

/** Simple graph constraints tailored to visual synthesis */
export function checkConstraints(g: ModelGraph): RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const n of g.nodes) {
    if (n.props && typeof n.props.centerOrigin !== "undefined") {
      const v = n.props.centerOrigin;
      if (typeof v !== "boolean") {
        out.push({ id: "constraint.centerOriginType", node: n.id, message: "centerOrigin must be boolean", severity: "error" });
      }
    }
    if (n.props && typeof n.props.index !== "undefined") {
      const idx = n.props.index;
      if (typeof idx !== "number" || idx < 0) {
        out.push({ id: "constraint.indexRange", node: n.id, message: "index must be a non-negative number", severity: "error" });
      }
    }
  }
  return out;
}

/**
 * Very lightweight policy: generated C++ should read audio via AUDIO_* macros only.
 * Flags common anti-patterns like raw 'spectrogram[' or 'tempo[' reads.
 */
export function enforceAudioAccess(generatedCpp: string): RuleViolation[] {
  const out: RuleViolation[] = [];
  const badPatterns = [/\bspectrogram\s*\[/, /\btempo\s*\[/, /\bchroma\s*\[/];
  for (const re of badPatterns) {
    if (re.test(generatedCpp) && !/AUDIO_\w+/.test(generatedCpp)) {
      out.push({ id: "audio.directAccess", node: -1, message: "Direct audio buffer access detected; use AUDIO_* macros", severity: "error" });
      break;
    }
  }
  return out;
}
