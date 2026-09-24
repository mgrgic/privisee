const Api = {
  async createShare(durationMinutes, userId) {
    const res = await fetch('/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationMinutes, userId }),
    });
    if (!res.ok) throw new Error('Failed to create share');
    return res.json();
  },

  async getShare(shareId) {
    const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}`);
    if (!res.ok) throw new Error('Share not found');
    return res.json();
  },

  async stopShare(shareId, ownerToken) {
    await fetch(`/api/shares/${encodeURIComponent(shareId)}/stop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerToken }),
    });
  },

  wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/ws`;
  },
};
