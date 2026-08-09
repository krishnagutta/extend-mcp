// Shared MCP response envelopes. Every tool returns one of these two shapes;
// errors always include { error: true, code, message, suggestion }.

export function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function err(code, message, suggestion) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: true, code, message, suggestion }) }] };
}
